import * as BbPromise from "bluebird";
import * as redis from "redis";

import { Driver } from "./base"

export class RedisDriver extends Driver {
  private client: redis.RedisClient;

  constructor(private serverURL: string, private options: redis.ClientOpts) {
    super();

    const DEFAULT_OPTIONS: redis.ClientOpts = {
      retry_strategy() {
        return 100; // retry after 100ms
      },
    };

    this.client = redis.createClient(serverURL, {
      ...DEFAULT_OPTIONS,
      ...options,
    });
  }

  public async touch(key: string, lifetime: number) {
    // @see https://redis.io/commands/expire#return-value
    // @type Integer reply
    //
    // 1 if the timeout was set.
    // 0 if key does not exist.
    const reply = await BbPromise.fromCallback<number>((cb) =>
      this.client.expire(key, lifetime, cb),
    );

    return reply === 1;
  }

  public async get<Result>(key: string) {
    const response = await BbPromise.fromCallback((cb) =>
      this.client.get(key, cb),
    );

    if (!response) {
      return undefined;
    }

    try {
      return JSON.parse(response) as Result;
    } catch (e) {
      return response as Result;
    }
  }

  public async getMulti<Result>(keys: string[]) {
    if (keys.length === 0) {
      return {};
    }

    const response = await BbPromise.fromCallback((cb) =>
      this.client.mget(keys, cb),
    );

    return keys.reduce((hash, key, index) => {
      const val = response[index];

      if (val !== undefined) {
        try {
          hash[key] = JSON.parse(val);
        } catch (e) {
          hash[key] = val;
        }
      } else {
        hash[key] = undefined;
      }

      return hash;
    }, {} as { [key: string]: Result | undefined });
  }

  public async set<Result>(key: string, value: Result, lifetime?: number) {
    const serialized = JSON.stringify(value);

    // @see https://redis.io/commands/setex#return-value
    // @type Simple string Reply
    if (!lifetime) {
      const reply = await BbPromise.fromCallback((cb) =>
        this.client.set(key, serialized, cb),
      );

      return reply === "OK";
    }

    const reply = await BbPromise.fromCallback((cb) =>
      this.client.setex(key, lifetime, serialized, cb),
    );

    return reply === "OK";
  }

  public async replace<Result>(key: string, value: Result, lifetime?: number) {
    const serialized = JSON.stringify(value);

    if (!lifetime) {
      const reply = await BbPromise.fromCallback((cb) =>
        this.client.set(key, serialized, "XX", cb), // XX -- Only set the key if it already exist.
      );

      return reply === "OK";
    }

    const reply = await BbPromise.fromCallback((cb) =>
      this.client.set(key, serialized, "EX", lifetime, "XX", cb),
    );

    return reply === "OK";
  }

  public async del(key: string) {
    // @see https://redis.io/commands/del#return-value
    // @type Integer reply: The number of keys that were removed.
    const reply = await BbPromise.fromCallback((cb) =>
      this.client.del(key, cb),
    );

    return reply > 0;
  }

  public async flush() {
    // @see https://redis.io/commands/flushdb
    // @type Simple string reply
    //
    // @note starting redis 4, redis support **ASYNC** flush mode.
    // since redis blocks everything during flush process,
    // flushing database which has huge number of keys can be cause redis server outage.
    // so it is great improvement, but currently AWS ElastiCache does not support redis 4.
    const reply = await BbPromise.fromCallback((cb) =>
      // @note this command does not flush entire redis database,
      // so this command **ONLY** flushes current active database
      this.client.flushdb(cb),
    );

    return reply === "OK";
  }

  public async end() {
    await BbPromise.fromCallback((cb) =>
      this.client.quit(cb), // quit method should disconnect connection cleanly
    );
  }
}
