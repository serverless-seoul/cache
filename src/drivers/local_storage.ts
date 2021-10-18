import LRUCache = require("lru-cache");

import { Driver } from "./base";

export class LocalStorageDriver implements Driver {
  private readonly store: LRUCache<string, any>;

  constructor(options: LRUCache.Options<string, any> = {}) {
    this.store = new LRUCache(options);
  }

  public async get<Result>(key: string): Promise<Result | undefined> {
    return this.store.get(key) as Result | undefined;
  }

  public async set<Result>(key: string, value: Result, lifetime?: number): Promise<void> {
    // LRU Cache ttl is in ms
    this.store.set(key, value, lifetime ? lifetime * 1000 : undefined);
  }

  public async setMulti<Result>(items: { key: string; value: Result; lifetime?: number }[]): Promise<void> {
    // since this.set is not really async anyway...
    for (const item of items) {
      await this.set<Result>(item.key, item.value, item.lifetime)
    }
  }

  public async ttl(key: string): Promise<number> {
    throw new Error("LocalStorageDriver doesn't support #ttl");
  }

  public async del(key: string): Promise<boolean> {
    this.store.del(key);
    return true;
  }

  public async getMulti<Result>(keys: string[]): Promise<{ [key: string]: Result | undefined }> {
    const result: { [key: string]: Result | undefined } = {};
    for (const key of keys) {
      result[key] = await this.get(key);
    }
    return result;
  }

  public async flush(): Promise<void> {
    return this.store.reset();
  }
}
