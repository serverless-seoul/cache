import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
chai.use(chaiAsPromised);
chai.should();

const { expect } = chai;

import { MemcachedDriver, RedisDriver } from "../drivers";
import { MemcachedFetcher } from "../fetcher";

describe(MemcachedFetcher.name, () => {
  context("with memcached driver", () => {
    describe("#multiFetch", () => {
      const memcached = new MemcachedDriver(process.env.MEMCACHED_URL as string, { autoDiscovery: false });
      const fetcher = new MemcachedFetcher(memcached);

      beforeEach(async () => {
        await memcached.flush();
      });

      it("should fetch only missing sets", async () => {
        const res1 = await fetcher.multiFetch(
          [1, 2, 3, 4, 5],
          "v1", (arg) => arg,
          3600,
          async (args) => {
            return args.map((arg) => arg * arg);
          }
        );
        expect(res1).to.deep.eq([1, 4, 9, 16, 25]);

        // it's using same hash key, so should reuse cache for exsiting values
        const res2 = await fetcher.multiFetch(
          [1, 2, 100, 200, 5],
          "v1", (arg) => arg,
          3600,
          async (args) => {
            return args.map((arg) => arg + arg);
          }
        );
        expect(res2).to.deep.eq([1, 4, 200, 400, 25]);

        let fetcherCalled = false;
        const res3 = await fetcher.multiFetch(
          [],
          "v1", (arg) => arg,
          3600,
          async (args) => {
            fetcherCalled = true;
            return args.map((arg) => arg);
          }
        );
        expect(fetcherCalled).to.be.eq(false);
        expect(res3).to.deep.eq([]);
      });
    });
  });

  context("with redis driver", () => {
    describe("#multiFetch", () => {
      const redis = new RedisDriver(process.env.REDIS_URL as string);
      const fetcher = new MemcachedFetcher(redis);

      it("should fetch only missing sets", async () => {
        const res1 = await fetcher.multiFetch(
          [1, 2, 3, 4, 5],
          "v1", (arg) => arg,
          3600,
          async (args) => {
            return args.map((arg) => arg * arg);
          }
        );
        expect(res1).to.deep.eq([1, 4, 9, 16, 25]);

        // it's using same hash key, so should reuse cache for exsiting values
        const res2 = await fetcher.multiFetch(
          [1, 2, 100, 200, 5],
          "v1", (arg) => arg,
          3600,
          async (args) => {
            return args.map((arg) => arg + arg);
          }
        );
        expect(res2).to.deep.eq([1, 4, 200, 400, 25]);

        let fetcherCalled = false;
        const res3 = await fetcher.multiFetch(
          [],
          "v1", (arg) => arg,
          3600,
          async (args) => {
            fetcherCalled = true;
            return args.map((arg) => arg);
          }
        );
        expect(fetcherCalled).to.be.eq(false);
        expect(res3).to.deep.eq([]);
      });
    });
  });
});
