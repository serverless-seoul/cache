import * as crypto from "crypto";
import { Driver } from "./drivers/base";

function isNotUndefinedOrNull<T>(x: T | undefined | null): x is T {
  return x !== undefined && x !== null;
}

export class MemcachedFetcher {
  private readonly keyHasher: (key: string) => string;

  constructor(private driver: Driver, options: { keyHashing?: boolean } = {}) {
    const keyHashing = options.keyHashing !== undefined ? options.keyHashing : true;
    if (keyHashing) {
      this.keyHasher = (key: string) =>
        crypto.createHash("md5")
          .update(key)
          .digest("hex");
    } else {
      this.keyHasher = (key: string) => key;
    }
  }

  public async fetch<Result>(key: string, lifetime: number, fetcher: () => Promise<Result>): Promise<Result> {
    const hash = this.keyHasher(key);

    let value = await this.driver.get<Result>(hash);

    if (!isNotUndefinedOrNull(value)) {
      value = await fetcher();
      await this.driver.set(hash, value, lifetime);
    }

    return value;
  }

  public async del(key: string) {
    const hash = this.keyHasher(key);
    return await this.driver.del(hash);
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

    const argsToKeyMap = new Map<Argument, string>(
      args.map((arg) => {
        const hash = this.keyHasher(`${namespace}:${argToKey(arg).toString()}`);
        return [arg, hash] as const;
      })
    );

    const cached = await this.driver.getMulti<Result>(Array.from(argsToKeyMap.values()));
    const missingArgs = args.filter((arg) => !isNotUndefinedOrNull(cached[argsToKeyMap.get(arg)!]));

    const fetchedArray = missingArgs.length > 0 ? await fetcher(missingArgs) : [];

    if (fetchedArray.length !== missingArgs.length) {
      throw new Error("Fetcher must return same length of result with Args.length");
    }
    const fetched = new Map<Argument, Result>(
      missingArgs.map((arg, index) => [arg, fetchedArray[index]] as [Argument, Result]));

    await Promise.all(
      Array.from(fetched).map( ([arg, result]) =>
        this.driver.set(argsToKeyMap.get(arg)!, result, lifetime),
      ),
    );

    return args.map((arg) => {
      const hash = argsToKeyMap.get(arg)!;
      const value = cached[hash];
      if (isNotUndefinedOrNull(value)) {
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
        const hashedKey = this.keyHasher(`${namespace}:${argToKey(arg).toString()}`);
        await this.driver.del(hashedKey);
      })
    );
  }
}
