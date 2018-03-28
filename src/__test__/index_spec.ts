import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
chai.use(chaiAsPromised);
chai.should();

const { expect } = chai;

import { MemcachedFetcher, Memcached } from "../index";

describe(MemcachedFetcher.name, () => {
  describe("#multiFetch", () => {
    const memcached = new Memcached(process.env.MEMCACHED_URL as string, { autoDiscovery: false });
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
});
