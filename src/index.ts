import * as __Memcached from "memcached";

export class Memcached<Result> extends __Memcached {
  /**
   * Touches the given key.
   * @param key The key
   * @param lifetime After how long should the key expire measured in seconds
   * @param cb
   */
  public touch(key: string, lifetime: number) {
    return new Promise<void>((resolve, reject) => {
      super.touch(key, lifetime, function(err: any) {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  /**
   * Get the value for the given key.
   * @param key The key
   * @param cb
   */
  public get(key: string) {
    return new Promise<Result>((resolve, reject) => {
      super.get(key, function(err: any, data: any) {
        if (err) reject(err);
        else resolve(data);
      });
    });
  }

  /**
   * Get the value and the CAS id.
   * @param key The key
   * @param cb
   */
  public gets(key: string) {
    return new Promise<{ value: Result | undefined, cas: string }>((resolve, reject) => {
      super.gets(key, function(err: any, data) {
        if (err) reject(err);
        else resolve({
          value: data[key],
          cas: data.cas,
        });
      });
    });
  }

  /**
   * Retrieves a bunch of values from multiple keys.
   * @param keys all the keys that needs to be fetched
   * @param cb
   */
  public getMulti(keys: string[]) {
    if (keys.length === 0) {
      return Promise.resolve({});
    }

    const aa = new Promise<{ [key: string]: Result }>((resolve, reject) => {
      super.getMulti(keys, function(err: any, data) {
        if (err) reject(err);
        else resolve(data);
      });
    });
  }

  /**
   * Stores a new value in Memcached.
   *
   * @param key The key
   * @param value Either a buffer, JSON, number or string that you want to store.
   * @param lifetime
   * @param cb
   */
  public set(key: string, value: Result, lifetime: number) {
    return new Promise<boolean>((resolve, reject) => {
      super.set(key, value, lifetime, function (err: any, result: boolean) {
        if (err) reject(err);
        else resolve(result);
      });
    });
  }

  /**
   * Replaces the value in memcached.
   * @param key The key
   * @param value Either a buffer, JSON, number or string that you want to store.
   * @param lifetime
   * @param cb
   */
  public replace(key: string, value: Result, lifetime: number) {
    return new Promise<boolean>((resolve, reject) => {
      super.replace(key, value, lifetime, function (err: any, result: boolean) {
        if (err) reject(err);
        else resolve(result);
      });
    });
  }

  /**
   * Add the value, only if it's not in memcached already.
   * @param key The key
   * @param value Either a buffer, JSON, number or string that you want to store.
   * @param lifetime
   * @param cb
   */
  public add(key: string, value: Result, lifetime: number) {
    return new Promise<boolean>((resolve, reject) => {
      super.add(key, value, lifetime, function (err: any, result: boolean) {
        if (err) reject(err);
        else resolve(result);
      });
    });
  }

  /**
   * Add the value, only if it matches the given CAS value.
   * @param key The key
   * @param value Either a buffer, JSON, number or string that you want to store.
   * @param cas
   * @param lifetime
   * @param cb
   */
  public cas(key: string, value: Result, cas: string, lifetime: number) {
    return new Promise<boolean>((resolve, reject) => {
      super.cas(key, value, cas, lifetime, function (err: any, result: boolean) {
        if (err) reject(err);
        else resolve(result);
      });
    });
  }

  /**
   * Add the given value string to the value of an existing item.
   * @param key The key
   * @param value Either a buffer, JSON, number or string that you want to store.
   * @param cb
   */
  public append(key: string, value: Result) {
    return new Promise<boolean>((resolve, reject) => {
      super.append(key, value, function (err: any, result: boolean) {
        if (err) reject(err);
        else resolve(result);
      });
    });
  }

  /**
   * Add the given value string to the value of an existing item.
   * @param key The key
   * @param value Either a buffer, JSON, number or string that you want to store.
   * @param cb
   */
  public prepend(key: string, value: Result) {
    return new Promise<boolean>((resolve, reject) => {
      super.prepend(key, value, function (err: any, result: boolean) {
        if (err) reject(err);
        else resolve(result);
      });
    });
  }

  /**
   * Increment a given key.
   * @param key The key
   * @param amount The increment
   * @param cb
   */
  public incr(key: string, amount: number) {
    return new Promise<boolean | number>((resolve, reject) => {
      super.incr(key, amount, function (err: any, result: boolean | number) {
        if (err) reject(err);
        else resolve(result);
      });
    });
  }

  /**
   * Decrement a given key.
   * @param key The key
   * @param amount The decrement
   * @param cb
   */
  public decr(key: string, amount: number) {
    return new Promise<boolean | number>((resolve, reject) => {
      super.decr(key, amount, function (err: any, result: boolean | number) {
        if (err) reject(err);
        else resolve(result);
      });
    });
  }

  /**
   * Remove the key from memcached.
   * @param key The key
   * @param cb
   */
  public del(key: string) {
    return new Promise<boolean>((resolve, reject) => {
      super.del(key, function (err: any, result: boolean) {
        if (err) reject(err);
        else resolve(result);
      });
    });
  }

  /**
   * Retrieves the version number of your server.
   * @param cb
   */
  public version() {
    return new Promise<__Memcached.VersionData[]>((resolve, reject) => {
      super.version(function (err: any, version: __Memcached.VersionData[]) {
        if (err) reject(err);
        else resolve(version);
      });
    });
  }

  /**
   * Retrieves your stats settings.
   * @param cb
   */
  public settings() {
    return new Promise<__Memcached.StatusData[]>((resolve, reject) => {
      super.version(function (err: any, version: __Memcached.StatusData[]) {
        if (err) reject(err);
        else resolve(version);
      });
    });
  }
  /**
   * Retrieves stats from your memcached server.
   * @param cb
   */
  public stats() {
    return new Promise<__Memcached.StatusData[]>((resolve, reject) => {
      super.version(function (err: any, version: __Memcached.StatusData[]) {
        if (err) reject(err);
        else resolve(version);
      });
    });
  }
  /**
   * Retrieves stats slabs information.
   * @param cb
   */
  public slabs() {
    return new Promise<__Memcached.StatusData[]>((resolve, reject) => {
      super.version(function (err: any, version: __Memcached.StatusData[]) {
        if (err) reject(err);
        else resolve(version);
      });
    });
  }
  /**
   * Retrieves stats items information.
   * @param cb
   */
  public items() {
    return new Promise<__Memcached.StatusData[]>((resolve, reject) => {
      super.version(function (err: any, version: __Memcached.StatusData[]) {
        if (err) reject(err);
        else resolve(version);
      });
    });
  }
  /**
   * Inspect cache, see examples for a detailed explanation.
   * @param server
   * @param slabid
   * @param number
   * @param cb
   */
  public cachedump(server: string, slabid: number, number: number) {
    return new Promise<__Memcached.CacheDumpData | __Memcached.CacheDumpData[]>((resolve, reject) => {
      super.cachedump(server, slabid, number, function (err: any, cachedump: __Memcached.CacheDumpData | __Memcached.CacheDumpData[]) {
        if (err) reject(err);
        else resolve(cachedump);
      });
    });
  }

  /**
   * Flushes the memcached server.
   * @param cb
   */
  public flush(cb?: (this: undefined, err: any, results: boolean[]) => void) {
    return new Promise<boolean[]>((resolve, reject) => {
      super.flush(function (err: any, results: boolean[]) {
        if (err) reject(err);
        else resolve(results);
      });
    });
  }

  /**
   * Closes all active memcached connections.
   */
  public end() {
    super.end();
  }
}
