import * as BbPromise from "bluebird";
import * as __Memcached from "memcached";

import { Driver } from "./base"

export type MemcachedOptions = __Memcached.options & {
  autoDiscovery: boolean;
  debug?: boolean;
};

export class MemcachedDriver extends Driver {
  private __client: Promise<__Memcached>;

  constructor(private serverURL: string, private options: MemcachedOptions) {
    super();

    const DEFAULT_OPTIONS = {
      // the time after which Memcached sends a connection timeout
      timeout: 1000,

      // the time between reconnection attempts
      reconnect: 100, // if dead, attempt reconnect each 100 ms

      // the time between a server failure and an attempt to set it up back in service.
      retry: 100, // When a server has an error, wait this amount of time before retrying

      retries: 2,
      poolSize: 2,

      // Time after which `failures` will be reset to original value, since last failure
      failuresTimeout: 15000,
    };

    this.__client = (async () => {
      const sharedOptions = {
        ...(DEFAULT_OPTIONS as any), // DEFAULT_OPTIONS has untyped entry, so just cast to any
        ...options,
        debug: options.debug || false,
        autoDiscovery: undefined, // omit
      } as __Memcached.options;

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

  public async touch(key: string, lifetime: number) {
    const client = await this.__client;

    return await BbPromise.fromCallback<boolean>((cb) =>
      client.touch(key, lifetime, cb),
    );
  }

  public async get<Result>(key: string) {
    const client = await this.__client;

    return await BbPromise.fromCallback<Result | undefined>((cb) =>
      client.get(key, cb),
    );
  }

  public async getMulti<Result>(keys: string[]) {
    if (keys.length === 0) {
      return {};
    }

    const client = await this.__client;

    return await BbPromise.fromCallback<{ [key: string]: Result | undefined }>((cb) =>
      client.getMulti(keys, cb),
    );
  }

  public async set<Result>(key: string, value: Result, lifetime: number = 0) {
    const client = await this.__client;

    return await BbPromise.fromCallback<boolean>((cb) =>
      client.set(key, value, lifetime, cb),
    );
  }

  public async replace<Result>(key: string, value: Result, lifetime: number = 0) {
    const client = await this.__client;

    return await BbPromise.fromCallback<boolean>((cb) =>
      client.replace(key, value, lifetime, cb),
    );
  }

  public async del(key: string) {
    const client = await this.__client;

    return await BbPromise.fromCallback<boolean>((cb) =>
      client.del(key, cb),
    );
  }

  public async flush() {
    const client = await this.__client;

    const responses = await BbPromise.fromCallback<boolean[]>((cb) =>
      client.flush(cb),
    );

    return responses.every((res) => res); // entire result set should have truthy value
  }

  public async end() {
    const client = await this.__client;

    return client.end();
  }
}
