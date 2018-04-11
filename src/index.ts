import * as __Memcached from "memcached";

export class Memcached {
  private __client: Promise<__Memcached>;

  constructor(private serverURL: string, private options: { autoDiscovery: boolean, debug?: boolean }) {
    this.__client = (async () => {
      const sharedOptions = { debug: options.debug || false } as any;
      if (options.autoDiscovery) {
        const configClient = new __Memcached(serverURL, sharedOptions);
        try {
          const serverURLs = await new Promise<string[]>((resolve, reject) => {
            (configClient as any).command(() => {
              return {
                command: 'config get cluster',
                callback: (err: Error, response: string) => {
                  if (err) {
                    reject(err);
                  } else {
                    const lines = response.split(/\r?\n/);
                    const unparsedNodes = lines[1].split(' ');
                    resolve(unparsedNodes.map((node) => {
                      const parts = node.split('|');
                      const hostName = parts[0];
                      const port = parts[2];

                      return `${hostName}:${port}`;
                    }));
                  }
                },
              };
            });
          });
          configClient.end();
          return new __Memcached(serverURLs, sharedOptions);
        } catch (e) {
          configClient.end();
          return new __Memcached(serverURL, sharedOptions);
        }
      } else {
        return new __Memcached(serverURL, sharedOptions);
      }
    })();
    if (options.debug) {
      this.__client.then((c) => {
        console.log("DEBUG : ", c);
      });
    }
  }

  /**
   * Touches the given key.
   * @param key The key
   * @param lifetime After how long should the key expire measured in seconds
   * @param cb
   */
  public async touch(key: string, lifetime: number) {
    return await this.__client.then((client) =>
      new Promise<void>((resolve, reject) => {
        client.touch(key, lifetime, function (err: any) {
          if (err) reject(err);
          else resolve();
        });
      })
    );
  }

  /**
   * Get the value for the given key.
   * @param key The key
   * @param cb
   */
  public async get<Result>(key: string) {
    return await this.__client.then((client) =>
      new Promise<Result>((resolve, reject) => {
        client.get(key, function(err: any, data: any) {
          if (err) reject(err);
          else resolve(data);
        });
      })
    );
  }

  /**
   * Retrieves a bunch of values from multiple keys.
   * @param keys all the keys that needs to be fetched
   * @param cb
   */
  public async getMulti<Result>(keys: string[]) {
    if (keys.length === 0) {
      return Promise.resolve({});
    }
    return await this.__client.then((client) =>
      new Promise<{ [key: string]: Result }>((resolve, reject) => {
        client.getMulti(keys, function (err: any, data) {
          if (err) reject(err);
          else resolve(data);
        });
      })
    );
  }

  /**
   * Stores a new value in Memcached.
   *
   * @param key The key
   * @param value Either a buffer, JSON, number or string that you want to store.
   * @param lifetime
   * @param cb
   */
  public async set<Result>(key: string, value: Result, lifetime: number) {
    return await this.__client.then((client) =>
      new Promise<boolean>((resolve, reject) => {
        client.set(key, value, lifetime, function (err: any, result: boolean) {
          if (err) reject(err);
          else resolve(result);
        });
      })
    );
  }

  /**
   * Replaces the value in memcached.
   * @param key The key
   * @param value Either a buffer, JSON, number or string that you want to store.
   * @param lifetime
   * @param cb
   */
  public async replace<Result>(key: string, value: Result, lifetime: number) {
    return await this.__client.then((client) =>
      new Promise<boolean>((resolve, reject) => {
        client.replace(key, value, lifetime, function (err: any, result: boolean) {
          if (err) reject(err);
          else resolve(result);
        });
      })
    );
  }

  /**
   * Remove the key from memcached.
   * @param key The key
   * @param cb
   */
  public async del(key: string) {
    return await this.__client.then((client) =>
      new Promise<boolean>((resolve, reject) => {
        client.del(key, function (err: any, result: boolean) {
          if (err) reject(err);
          else resolve(result);
        });
      })
    );
  }

  /**
   * Flushes the memcached server.
   * @param cb
   */
  public async flush(cb?: (this: undefined, err: any, results: boolean[]) => void) {
    return await this.__client.then((client) =>
      new Promise<boolean[]>((resolve, reject) => {
        client.flush(function (err: any, results: boolean[]) {
          if (err) reject(err);
          else resolve(results);
        });
      })
    );
  }

  /**
   * Closes all active memcached connections.
   */
  public async end() {
    return await this.__client.then((client) => client.end());
  }
}

export class MemcachedFetcher {
  constructor(private memcached: Memcached) {}

  public async fetch<Result>(key: string, lifetime: number, fetcher: () => Promise<Result>): Promise<Result> {
    let value = await this.memcached.get<Result>(key);
    if (!value) {
      value = await fetcher();
      await this.memcached.set(key, value, lifetime);
    }
    return value;
  }

  public async multiFetch<Argument, Result>(
    args: Argument[],
    argToKey: (args: Argument) => string,
    lifetime: number,
    fetcher: (args: Argument[]) => Promise<Result[]>,
  ): Promise<Result[]> {
    // Memcached has multiGet bug
    if (args.length === 0) {
      return [];
    }

    const argsToKeyMap = new Map<Argument, string>(
      args.map((arg) => [arg, argToKey(arg)] as [Argument, string]));

    const cached = await (this.memcached.getMulti(Array.from(argsToKeyMap.values())) as Promise<{ [key: string]: Result }>);
    const missingArgs = args.filter((arg) => cached[argsToKeyMap.get(arg)!] === undefined);

    const fetchedArray = missingArgs.length > 0 ? await fetcher(missingArgs) : [];

    if (fetchedArray.length !== missingArgs.length) {
      throw new Error("Fetcher must return same length of result with Args.length");
    }
    const fetched = new Map<Argument, Result>(
      missingArgs.map((arg, index) => [arg, fetchedArray[index]] as [Argument, Result]));

    await Promise.all(Array.from(fetched).map(async ([arg, result]) => {
      await this.memcached.set(argsToKeyMap.get(arg)!, result, lifetime);
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