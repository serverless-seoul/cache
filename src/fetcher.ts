import * as crypto from "crypto";
import { Driver } from "./drivers/base";

type KeyTransform = (key: string) => string;

export class CachedFetcher {
  public readonly keyTransform: KeyTransform;

  constructor(
    private drivers: Driver[],
    options: {
      keyTransform?:
        { type: "hashing", algorithm: "md5" } // Currently it only support md5
        | { type: "prefix", prefix: string }
        | KeyTransform; // Custom Transform
    } = {}
  ) {
    if (options.keyTransform) {
      if ("type" in options.keyTransform) {
        if (options.keyTransform.type === "hashing") {
          this.keyTransform = (key: string) => {
            return crypto.createHash("md5")
              .update(key)
              .digest("hex");
          }
        } else {
          const { prefix } = options.keyTransform;
          this.keyTransform = (key: string) => {
            return `${prefix}${key}`;
          }
        }
      } else {
        // Custom function
        this.keyTransform = options.keyTransform;
      }
    } else {
      this.keyTransform = (key: string) => key; // Bypass
    }
  }

  /**
   *
   * @param transformedKey
   * @returns
   */
  private async cascadedGet<Result>(
    transformedKey: string,
    lifetime: number
  ) {
    let value: Result | undefined = undefined;
    for (let i = 0;i<this.drivers.length; i++) {
      const driver = this.drivers[i];

      value = await driver.get(transformedKey);
      if (value !== undefined) {
        // Fill missing top drivers
        if (i > 0) {
          await Promise.all(
            this.drivers.slice(0, i).map(driver => driver.set(transformedKey, value, lifetime))
          );
        }
        // And returns
        return value;
      }
    }
    return undefined;
  }

  /**
   * @param transformedKey
   * @returns
   */
  private async cascadedMultiGet<Result>(
    transformedKeys: string[],
    lifetime: number
  ) {
    const mergedResult: { [key: string]: Result | undefined } = {};

    let missingKeys = transformedKeys;
    let driverIndex = 0;
    let driver = this.drivers[driverIndex];

    // Every driver returns value, and if the next driver has value, it back fill drivers in front.
    // this loops until driver ran out or keys are all have values
    while (missingKeys.length > 0 && driver) {
      const localResult = await driver.getMulti<Result>(missingKeys);
      // Add to global result,
      Object.assign(mergedResult, localResult);
      // Propaginated upwards
      if (driverIndex > 0) {
        await Promise.all(
          this.drivers
            .slice(0, driverIndex)
            .map(async driver => {
              for (const key in localResult) {
                const value = localResult[key];
                await driver.set(key, value, lifetime);
              }
            })
        );
      }
      missingKeys = missingKeys.filter((key) => localResult[key] === undefined);

      driverIndex ++;
      driver = this.drivers[driverIndex];
    }

    return mergedResult;
  }

  public async fetch<Result>(key: string, lifetime: number, fetcher: () => Promise<Result>): Promise<Result> {
    const transformedKey = this.keyTransform(key);
    const cached = await this.cascadedGet<Result>(key, lifetime);
    if (!this.isValue<Result>(cached)) {
      try {
        const fetched = await fetcher();
        await Promise.all(this.drivers.map(driver => driver.set(transformedKey, fetched, lifetime)));
        return fetched;
      } catch (e) {
        // If cached value is available, swallow thrown error and reuse cache
        if (this.isValue<Result>(cached)) {
          return cached;
        }
        throw e;
      }
    }
    return cached;
  }

  public async del(key: string) {
    await Promise.all(this.drivers.map(driver => driver.del(this.keyTransform(key))));
  }

  public async multiFetch<Argument, Result>(
    args: Argument[],
    key: string | [string, (args: Argument) => { toString(): string }],
    lifetime: number,
    fetcher: (args: Argument[]) => Promise<Result[]>
  ): Promise<Result[]> {
    if (args.length === 0) {
      return [];
    }

    const { namespace, argToKey } = (() => {
      if (typeof key === "string") {
        return { namespace: key, argToKey: (arg: Argument) => String(arg) };
      } else {
        return { namespace: key[0], argToKey: key[1] };
      }
    })();

    const argsToTransformedKeyMap = new Map<Argument, string>(
      args.map((arg) => {
        const transformedKey = this.keyTransform(`${namespace}:${argToKey(arg).toString()}`);
        return [arg, transformedKey] as const;
      })
    );

    const cached = await this.cascadedMultiGet<Result>(Array.from(argsToTransformedKeyMap.values()), lifetime);
    const missingArgs = args.filter((arg) => !this.isValue(cached[argsToTransformedKeyMap.get(arg)!]));

    const fetchedArray = missingArgs.length > 0 ? await fetcher(missingArgs) : [];

    if (fetchedArray.length !== missingArgs.length) {
      throw new Error("Fetcher must return same length of result with Args.length");
    }
    const fetched = new Map<Argument, Result>(
      missingArgs.map((arg, index) => [arg, fetchedArray[index]] as [Argument, Result]));

    const cachableItems: Array<{ key: string, value: Result, lifetime: number }> = [];
    Array.from(fetched).forEach(async ([arg, result]) => {
      if (this.isValue(result)) {
        cachableItems.push({ key: argsToTransformedKeyMap.get(arg)!, value: result, lifetime });
      }
    })
    await Promise.all(this.drivers.map(driver => driver.setMulti(cachableItems)));

    return args.map((arg) => {
      const transformedKey = argsToTransformedKeyMap.get(arg)!;
      const value = cached[transformedKey];
      if (this.isValue(value)) {
        return value;
      } else {
        return fetched.get(arg)!;
      }
    });
  }

  public async multiFetchDelete<Argument, Result>(
    args: Argument[],
    key: string | [string, (args: Argument) => { toString(): string }]
  ) {
    const { namespace, argToKey } = (() => {
      if (typeof (key) === "string") {
        return { namespace: key, argToKey: (arg: Argument) => String(arg) };
      } else {
        return { namespace: key[0], argToKey: key[1] };
      }
    })();

    await Promise.all(
      args.map(async (arg) => {
        const key = this.keyTransform(`${namespace}:${argToKey(arg).toString()}`);
        await Promise.all(this.drivers.map(driver => driver.del(key)));
      })
    );
  }

  private isValue<T>(value: T | undefined | null): value is T {
    return value !== undefined;
  }
}
