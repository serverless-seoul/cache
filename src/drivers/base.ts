export interface Driver {
  /**
   * Get the value for the given key.
   * @param key The key
   * @returns Promise<Result>
   */
  get<Result>(key: string): Promise<Result | undefined>;

  /**
   * Get remaining TTL for the given key.
   * @param key
   * @Returns Promise<number>
   */
  ttl(key: string): Promise<number>;

  /**
   * Retrieves a bunch of values from multiple keys.
   * @param keys all the keys that needs to be fetched
   * @return Promise<Result>
   */
  getMulti<Result>(keys: string[]): Promise<{ [key: string]: Result | undefined }>;

  /**
   * Stores a new value in Memcached.
   *
   * @param key The key
   * @param value Either a buffer, JSON, number or string that you want to store.
   * @param lifetime
   * @return Promise<boolean>
   */
  set<Result>(key: string, value: Result, lifetime?: number): Promise<void>;

  del(key: string): Promise<boolean>;

  /**
   * Flushes the memcached server.
   * @return Promise<void>
   */
  flush(): Promise<void>;
}
