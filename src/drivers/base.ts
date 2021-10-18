export interface Driver {
  /**
   * Get the value for the given key.
   * @param key The key
   * @returns Promise<Result>
   */
  get<Result>(key: string): Promise<Result | undefined>;

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
  setMulti<Result>(items: { key: string; value: Result; lifetime?: number }[]): Promise<void>;

  del(key: string): Promise<boolean>;

  /**
   * remaing lifetime of given key (in second)
   * positive number means => lifetime
   * undefined means => key exists but doesn't have expiration
   * null means => key doesn't exists
   */
   ttl(key: string): Promise<number | undefined | null>;

  /**
   * Flushes the cache server
   * @return Promise<void>
   */
  flush(): Promise<void>;
}
