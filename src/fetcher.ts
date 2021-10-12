import * as crypto from "crypto";
import { Driver } from "./drivers/base";

type Lifetime = {
  cacheTime: number;
  staleTime?: number;
};

type KeyTransform = (key: string) => string;
export class MemcachedFetcher {
  public readonly keyTransform: KeyTransform;

  constructor(
    private driver: Driver,
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

  public async fetch<Result>(key: string, lifetime: number | Lifetime, fetcher: () => Promise<Result>): Promise<Result> {
    const hash = this.keyTransform(key);

    const { cacheTime, staleTime = 0 } = typeof lifetime === "number"
      ? { cacheTime: lifetime }
      : lifetime;

    const [cached, ttl] = await Promise.all([
      this.driver.get<Result>(hash),
      staleTime ? this.driver.ttl(hash) : Promise.resolve(0),
    ]);

    if (!this.isValue(cached) || this.isStale(ttl, cacheTime, staleTime)) {
      try {
        const fetched = await fetcher();
        await this.driver.set(hash, fetched, cacheTime);
        return fetched;
      } catch (e) {
        // If cached value is available, swallow thrown error and reuse cache
        if (this.isValue(cached)) {
          return cached;
        }

        // Otherwise throw error
        throw e;
      }
    }

    return cached;
  }

  public async del(key: string) {
    const hash = this.keyTransform(key);
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
        const hash = this.keyTransform(`${namespace}:${argToKey(arg).toString()}`);
        return [arg, hash] as const;
      })
    );

    const cached = await this.driver.getMulti<Result>(Array.from(argsToKeyMap.values()));
    const missingArgs = args.filter((arg) => !this.isValue(cached[argsToKeyMap.get(arg)!]));

    const fetchedArray = missingArgs.length > 0 ? await fetcher(missingArgs) : [];

    if (fetchedArray.length !== missingArgs.length) {
      throw new Error("Fetcher must return same length of result with Args.length");
    }
    const fetched = new Map<Argument, Result>(
      missingArgs.map((arg, index) => [arg, fetchedArray[index]] as [Argument, Result]));

    await Promise.all(
      Array.from(fetched).map(async ([arg, result]) => {
        if (this.isValue(result)) {
          await this.driver.set(argsToKeyMap.get(arg)!, result, lifetime);
        } else {
          // if fetcher returns undefined, that means user intentionally not want to cache this value
        }
      }),
    );

    return args.map((arg) => {
      const hash = argsToKeyMap.get(arg)!;
      const value = cached[hash];
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
        const hashedKey = this.keyTransform(`${namespace}:${argToKey(arg).toString()}`);
        await this.driver.del(hashedKey);
      })
    );
  }

  private isStale(ttl: number, cacheTime: number, staleTime?: number): boolean {
    return !!staleTime && ttl > 0 && (cacheTime - staleTime) > ttl;
  }

  private isValue<T>(value: T | undefined | null): value is T {
    return value !== undefined;
  }
}
