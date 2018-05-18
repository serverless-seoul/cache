import { Driver } from "./drivers/base";

export class MemcachedFetcher {
  constructor(private driver: Driver) {}

  public async fetch<Result>(key: string, lifetime: number, fetcher: () => Promise<Result>): Promise<Result> {
    let value = await this.driver.get<Result>(key);

    if (!value) {
      value = await fetcher();
      await this.driver.set(key, value, lifetime);
    }

    return value;
  }

  public async multiFetch<Argument, Result>(
    args: Argument[],
    namespace: string,
    argToKey: (args: Argument) => { toString(): string },
    lifetime: number,
    fetcher: (args: Argument[]) => Promise<Result[]>,
  ): Promise<Result[]> {
    // Memcached has multiGet bug
    if (args.length === 0) {
      return [];
    }

    const argsToKeyMap = new Map<Argument, string>(
      args.map((arg) => [arg, `${namespace}:${argToKey(arg).toString()}`] as [Argument, string]));

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