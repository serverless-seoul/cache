import { Driver } from "./drivers/base";
import * as crypto from "crypto";

export class MemcachedFetcher {
  private readonly keyHasher: (key: string) => string;

  constructor(private driver: Driver, options: { keyHashing?: boolean } = {}) {
    const keyHashing = options.keyHashing !== undefined ? options.keyHashing : true;
    if (keyHashing) {
      this.keyHasher = (key: string) => {
        return crypto
          .createHash("md5")
          .update(key)
          .digest("hex");
      };
    } else {
      this.keyHasher = (key: string) => key;
    }
  }

  public async fetch<Result>(key: string, lifetime: number, fetcher: () => Promise<Result>): Promise<Result> {
    const hasheKey = this.keyHasher(key);

    let value = await this.driver.get<Result>(hasheKey);

    if (!value) {
      value = await fetcher();
      await this.driver.set(hasheKey, value, lifetime);
    }

    return value;
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
      if (typeof (key) === "string") {
        return { namespace: key, argToKey: (arg: Argument) => arg.toString() };
      } else {
        return { namespace: key[0], argToKey: key[1] };
      }
    })();

    const argsToKeyMap = new Map<Argument, string>(
      args.map((arg) => {
        const key = `${namespace}:${argToKey(arg).toString()}`;
        return [arg, this.keyHasher(key)] as [Argument, string];
      })
    );

    const cached = await (this.driver.getMulti(Array.from(argsToKeyMap.values())) as Promise<{ [key: string]: Result }>);
    const missingArgs = args.filter((arg) => cached[argsToKeyMap.get(arg)!] === undefined);

    const fetchedArray = missingArgs.length > 0 ? await fetcher(missingArgs) : [];

    if (fetchedArray.length !== missingArgs.length) {
      throw new Error("Fetcher must return same length of result with Args.length");
    }
    const fetched = new Map<Argument, Result>(
      missingArgs.map((arg, index) => [arg, fetchedArray[index]] as [Argument, Result]));

    await Promise.all(Array.from(fetched).map(async ([arg, result]) => {
      await this.driver.set(argsToKeyMap.get(arg)!, result, lifetime);
    }));

    return args.map((arg) => {
      const key = argsToKeyMap.get(arg)!;
      if (cached[key]) {
        return cached[key];
      } else {
        return fetched.get(arg)!;
      }
    });
  }
}