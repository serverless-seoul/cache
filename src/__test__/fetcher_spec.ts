import { expect } from "chai";

import {
  RedisDriver
} from "../drivers";

import { MemcachedFetcher } from "../fetcher";

describe(MemcachedFetcher.name, () => {
  [
    new RedisDriver(process.env.REDIS_URL as string),
  ].forEach((driver) => {
    context(`with ${driver.constructor.name}`, () => {
      const fetcher = new MemcachedFetcher(driver);

      beforeEach(async () => {
        await driver.flush();
      });

      describe("#multiFetch", () => {
        it("should fetch only missing sets", async () => {
          const res1 = await fetcher.multiFetch(
            [1, 2, 3, 4, 5],
            "v1",
            3600,
            async (args) => {
              return args.map((arg) => arg * arg);
            }
          );
          expect(res1).to.deep.eq([1, 4, 9, 16, 25]);

          // it's using same hash key, so should reuse cache for exsiting values
          const res2 = await fetcher.multiFetch(
            [1, 2, 100, 200, 5],
            ["v1", (arg) => arg],
            3600,
            async (args) => {
              return args.map((arg) => arg + arg);
            }
          );
          expect(res2).to.deep.eq([1, 4, 200, 400, 25]);

          let fetcherCalled = false;
          const res3 = await fetcher.multiFetch(
            [],
            ["v1", (arg) => arg],
            3600,
            async (args) => {
              fetcherCalled = true;
              return args.map((arg) => arg);
            }
          );
          expect(fetcherCalled).to.be.eq(false);
          expect(res3).to.deep.eq([]);
        });

        it("should cache the value <0>", async () => {
          const res1 = await fetcher.multiFetch(
            [1, 2, 0],
            "v1",
            3600,
            async (args) => args
          );
          expect(res1).to.deep.eq([1, 2, 0]);

          const res2 = await fetcher.multiFetch(
            [1, 2, 0, 0],
            "v1",
            3600,
            async (args) => args.map(__ => 100)
          );
          expect(res2).to.deep.eq([1, 2, 0, 0]);
        });

        it("should cache the value <null>", async () => {
          const res1 = await fetcher.multiFetch(
            [1, 2, 3, 4],
            "v1",
            3600,
            async (args) => {
              return args.map(i => {
                if (i % 2 === 0) {
                  return null;
                } else {
                  return i;
                }
              });
            }
          );
          expect(res1).to.deep.eq([1, null, 3, null]);

          const res2 = await fetcher.multiFetch(
            [1, 2, 3, 4],
            "v1",
            3600,
            async (args) => args.map(__ => -1)
          );
          expect(res2).to.deep.eq([1, null, 3, null]);
        });

        it("should not cache the value undefined, and revalidate next time", async () => {
          const res1 = await fetcher.multiFetch(
            [1, 2, 3, 4],
            "v1",
            3600,
            async (args) => {
              return args.map(i => {
                if (i % 2 === 0) {
                  return undefined;
                } else {
                  return i;
                }
              });
            }
          );
          expect(res1).to.deep.eq([1, undefined, 3, undefined]);

          const res2 = await fetcher.multiFetch(
            [1, 2, 3, 4],
            "v1",
            3600,
            async (args) => args.map(__ => -1)
          );
          expect(res2).to.deep.eq([1, -1, 3, -1]);
        });
      });

      describe("#multiFetchDelete", () => {
        it("should fetch only missing sets", async () => {
          expect(await fetcher.multiFetch(
            [1, 2, 3, 4, 5],
            "v1",
            3600,
            async (args) => {
              return args.map((arg) => arg * arg);
            }
          )).to.deep.eq([1, 4, 9, 16, 25]);

          await fetcher.multiFetchDelete([1, 2, 3], "v1");

          expect(await fetcher.multiFetch(
            [1, 2, 3, 4, 5],
            "v1",
            3600,
            async (args) => {
              return args.map(() => 0);
            }
          )).to.deep.eq([0, 0, 0, 16, 25]);
        });
      });
    });
  });
});
