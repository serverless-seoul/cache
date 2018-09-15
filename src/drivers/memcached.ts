const MemcachedPlus = require("memcache-plus");

import { Driver } from "./base"

export class MemcachedDriver implements Driver {
  public client: any;
  constructor(private serverURL: string, private options: { autoDiscovery: boolean }) {
    this.client = new MemcachedPlus({
      hosts: [serverURL],
      autodiscover: options.autoDiscovery || false,
      netTimeout: 500,
      reconnect: true,
    })
  }

  public async get<Result>(key: string): Promise<Result | undefined> {
    const res = await this.client.get(key);
    if (res === null) {
      return undefined;
    } else {
      return res;
    }
  }

  public async getMulti<Result>(keys: string[]): Promise<{ [key: string]: Result | undefined }> {
    const values = await this.client.getMulti(keys) as { [key: string]: Result | undefined };
    const res: { [key: string]: Result | undefined } = {};
    for (const key in values) {
      const value = values[key];
      res[key] = value;
    }
    return res;
  }

  public async set<Result>(key: string, value: Result, lifetime?: number) {
    await this.client.set(key, value, lifetime);
  }

  public async del(key: string) {
    return await this.client.delete(key);
  }

  public async flush<Result>() {
    await this.client.flush();
  }
}
