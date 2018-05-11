export abstract class Driver {
  /**
   * Touches the given key.
   * @param key The key
   * @param lifetime After how long should the key expire measured in seconds
   * @return Promise<boolean>
   */
  public abstract async touch(key: string, lifetime: number): Promise<boolean>;

  /**
   * Get the value for the given key.
   * @param key The key
   * @returns Promise<Result>
   */
  public abstract async get<Result>(key: string): Promise<Result | undefined>;

  /**
   * Retrieves a bunch of values from multiple keys.
   * @param keys all the keys that needs to be fetched
   * @return Promise<Result>
   */
  public abstract async getMulti<Result>(keys: string[]): Promise<{ [key: string]: Result | undefined }>;

  /**
   * Stores a new value in Memcached.
   *
   * @param key The key
   * @param value Either a buffer, JSON, number or string that you want to store.
   * @param lifetime
   * @return Promise<boolean>
   */
  public abstract async set<Result>(key: string, value: Result, lifetime?: number): Promise<boolean>;

  /**
   * Replaces the value in memcached.
   * @param key The key
   * @param value Either a buffer, JSON, number or string that you want to store.
   * @param lifetime
   * @return Promise<boolean>
   */
  public abstract async replace<Result>(key: string, value: Result, lifetime?: number): Promise<boolean>;

  /**
   * Remove the key from memcached.
   * @param key The key
   * @return Promise<boolean>
   */
  public abstract async del(key: string): Promise<boolean>;

  /**
   * Flushes the memcached server.
   * @return Promise<boolean>
   */
  public abstract async flush(): Promise<boolean>;


  /**
   * Closes all active memcached connections.
   */
  public abstract async end(): Promise<void>;
}

