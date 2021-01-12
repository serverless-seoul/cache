import * as IORedis from "ioredis";

import { Driver } from "./base";

export interface RedisClusterDriverOptions {
  ioredis?: IORedis.ClusterOptions;
}

export class RedisClusterDriver implements Driver {
  public client: IORedis.Cluster;

  constructor(private serverUrl: string, private options: RedisClusterDriverOptions = {}) {
    const DEFAULT_OPTIONS: IORedis.ClusterOptions = {
      clusterRetryStrategy(attempt: number) {
        // use exponential backoff
        // 50 (Min) => 100 => 200 => 400 => 800 => 1600 => 2000 (Max)
        return Math.min(50 * Math.pow(2, attempt), 2000);
      },
      redisOptions: {
        retryStrategy(attempt) {
          // use exponential backoff
          // 50 (Min) => 100 => 200 => 400 => 800 => 1600 => 2000 (Max)
          return Math.min(50 * Math.pow(2, attempt), 2000);
        },
      },
    };

    this.client = new IORedis.Cluster([serverUrl], {
      ...DEFAULT_OPTIONS,
      ...(options.ioredis || {}),
    });
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

  public async get<Result>(key: string): Promise<Result | undefined> {
    const response = await this.client.get(key);

    if (response === null) { // indicates given key does not exist
      return undefined;
    }

    try {
      return JSON.parse(response) as Result;
    } catch (e) {
      return response as any; // if failed to decode serialized value, return raw value instead.
    }
  }

  // In cluster mode, MGET (multiple get) command requires all keys must be same key slot
  // if client does not handle this, redis will give "CROSSSLOT Keys in request don't hash to the same slot" Error.
  //
  // this is temporary workaround to eliminate CROSSSLOT issue.
  // Using this method in Cluster Mode highly not recommended!
  public async getMulti<Result>(keys: string[]) {
    if (keys.length === 0) {
      return {};
    }

    const response = await Promise.all(keys.map((key) => this.client.get(key)));
    return keys.reduce((hash, key, index) => {
      const val = response[index];

      if (val === null) {
        // Indicate given key does not exist
        hash[key] = undefined;
      } else {
        try {
          hash[key] = JSON.parse(val);
        } catch (e) {
          hash[key] = val as any;
        }
      }

      return hash;
    }, {} as { [key: string]: Result | undefined });
  }

  public async set<Result>(key: string, value: Result, lifetime?: number) {
    const serialized = JSON.stringify(value);

    // @see https://redis.io/commands/setex#return-value
    // @type Simple string Reply
    let reply: string | null;
    if (!lifetime) {
      reply = await this.client.set(key, serialized);
    } else {
      reply = await this.client.setex(key, lifetime, serialized);
    }

    if (reply !== "OK") {
      throw new Error(`RedisDriver failed to set: '${key} - ${value}'`);
    }
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

    if (reply !== "OK") {
      throw new Error(`RedisDriver failed to flush: '${reply}'`);
    }
  }

  public async end() {
    await this.client.quit(); // quit method should disconnect connection cleanly
  }
}
