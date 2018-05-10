import * as IORedis from "ioredis";

import { Driver } from "./base"

export interface StandaloneModeOptions {
  enableClusterMode?: false;
  ioredis?: IORedis.RedisOptions;
}

export interface ClusterModeOptions {
  enableClusterMode: true;
  ioredis?: IORedis.ClusterOptions;
}

export type RedisDriverOptions = StandaloneModeOptions | ClusterModeOptions;

export class RedisDriver extends Driver {
  public client: IORedis.Redis;

  constructor(private serverUrl: string, private options: RedisDriverOptions = {}) {
    super();

    if (options.enableClusterMode) {
      const DEFAULT_OPTIONS: IORedis.ClusterOptions = {
        clusterRetryStrategy(times) {
          return 100; // retry after 100ms
        },
      };

      // if server url is master, node discovery is automatically performed
      this.client = new IORedis.Cluster([serverUrl], {
        ...DEFAULT_OPTIONS,
        ...(options.ioredis || {}),
      });
    } else {
      const DEFAULT_OPTIONS: IORedis.RedisOptions = {
        retryStrategy(times) {
          return 100; // retry after 100ms
        },
      };

      this.client = new IORedis(serverUrl, {
        ...DEFAULT_OPTIONS,
        ...(options.ioredis || {}),
      });
    }
  }

  public async touch(key: string, lifetime: number) {
    // @see https://redis.io/commands/expire#return-value
    // @type Integer reply
    //
    // 1 if the timeout was set.
    // 0 if key does not exist.
    const reply = await this.client.expire(key, lifetime);

    return reply === 1;
  }

  public async get<Result>(key: string) {
    const response = await this.client.get(key);

    if (!response) {
      return undefined;
    }

    try {
      return JSON.parse(response) as Result;
    } catch (e) {
      return response as any;
    }
  }

  public async getMulti<Result>(keys: string[]) {
    if (keys.length === 0) {
      return {};
    }

    const response = await this.client.mget(...keys);

    return keys.reduce((hash, key, index) => {
      const val = response[index];

      if (val !== null) {
        try {
          hash[key] = JSON.parse(val);
        } catch (e) {
          hash[key] = val;
        }

        return hash;
      }

      hash[key] = undefined;
      return hash;
    }, {} as { [key: string]: Result | undefined });
  }

  public async set<Result>(key: string, value: Result, lifetime?: number) {
    const serialized = JSON.stringify(value);

    // @see https://redis.io/commands/setex#return-value
    // @type Simple string Reply
    if (!lifetime) {
      const reply = await this.client.set(key, serialized);

      return reply === "OK";
    }

    const reply = await this.client.setex(key, lifetime, serialized);

    return reply === "OK";
  }

  public async replace<Result>(key: string, value: Result, lifetime?: number) {
    const serialized = JSON.stringify(value);

    const reply = await (lifetime ?
      this.client.set(key, serialized, "EX", lifetime, "XX") :
      this.client.set(key, serialized, "XX") // XX -- Only set the key if it already exist.
    );

    return reply === "OK";
  }

  public async del(key: string) {
    // @see https://redis.io/commands/del#return-value
    // @type Integer reply: The number of keys that were removed.
    const reply = await this.client.del(key);

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

    // @note this command does not flush entire redis database,
    // so this command **ONLY** flushes current active database
    const reply = await this.client.flushdb();

    return reply === "OK";
  }

  public async end() {
    await this.client.quit(); // quit method should disconnect connection cleanly
  }
}
