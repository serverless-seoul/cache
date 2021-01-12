# @serverless-seoul/cache

[![Build Status](https://github.com/serverless-seoul/cache/workflows/workflow/badge.svg)](https://github.com/serverless-seoul/cache/actions)

### Installation

```bash
$ npm install @serverless-seoul/cache --save
```

### Features

1. Support Promise for every method
2. Support <T> for get / set methods
3. Advanced cache-access pattern such as fetch.


### Example

```typescript
describe("#fetchMulti", () => {
  const memcached = new Memcached();
  const fetcher = new MemcachedFetcher(memcached);

  it("should fetch only missing sets", async () => {
    const res1 = await fetcher.multiFetch(
      [1, 2, 3, 4, 5],
      (arg) => `v1-${arg}`,
      3600,
      async (args) => {
        return args.map((arg) => arg * arg);
      }
    );
    expect(res1).to.deep.eq([1, 4, 9, 16, 25]);

    // it's using same hash key, so should reuse cache for exsiting values
    const res2 = await fetcher.multiFetch(
      [1, 2, 100, 200, 5],
      (arg) => `v1-${arg}`,
      3600,
      async (args) => {
        return args.map((arg) => arg + arg);
      }
    );
    expect(res2).to.deep.eq([1, 4, 200, 400, 25]);

    const res3 = await fetcher.multiFetch(
      [],
      (arg) => `v1-${arg}`,
      3600,
      async (args) => {
        return args.map((arg) => arg);
      }
    );
    expect(res3).to.deep.eq([]);
  });
});
```

### Supported Drivers

- Redis
- Clustered Redis
