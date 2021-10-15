import { expect } from "chai";
import * as sinon from "sinon";

import {
  LocalStorageDriver,
  RedisDriver,
} from "../drivers";
import { Driver } from "../drivers/base";

import { CachedFetcher } from "../fetcher";

describe(CachedFetcher.name, () => {
  context("With multidriver", () => {
    describe("#fetch", () => {
      const drivers: [Driver, Driver] = [
        new LocalStorageDriver(),
        new RedisDriver(process.env.REDIS_URL as string),
      ];
      const subject: CachedFetcher = new CachedFetcher(drivers);

      beforeEach(async () => {
        await Promise.all(drivers.map((driver) => driver.flush()));
      });

      context("when L1/L2 both doens't have data", () => {
        it("should populate data for both L1/L2", async () => {
          const value = 100;
          const fn = sinon.fake.resolves(value);

          const key = "random-key";
          const v1 = await subject.fetch(key, 60, fn);
          expect(fn.callCount).to.eq(1);
          expect(v1).to.deep.eq(value);

          const v2 = await subject.fetch(key, 60, fn);
          // Should cache the value
          expect(fn.callCount).to.eq(1);
          expect(v2).to.deep.eq(value);

          // both drivers should have data now
          expect(await drivers[0].get(key)).to.be.eq(value);
          expect(await drivers[1].get(key)).to.be.eq(value);
        });
      });

      context("when only L1 has cached data", () => {
        it("should only access L1, and return the data", async () => {
          const fetcher = async () => 100;
          const key = "random-key";

          await drivers[0].set(key, await fetcher());

          expect(await subject.fetch(key, 60, fetcher))
            .to.be.deep.eq(100);

          expect(await drivers[0].get(key)).to.be.eq(100, "L1 should have it");
          expect(await drivers[1].get(key)).to.be.eq(undefined, "L2 still doesn't have it");
        });
      });

      context("when only L2 has cached data", () => {
        it("should fill the L1, and return the data", async () => {
          const fetcher = async () => 100;
          const key = "random-key";

          // Fill L2
          await drivers[1].set(key, await fetcher());

          expect(await subject.fetch(key, 60, fetcher))
            .to.be.deep.eq(100);

          // L1 has to be popluated
          expect(await drivers[0].get(key)).to.be.eq(100);
          expect(await drivers[1].get(key)).to.be.eq(100);
        });
      });
    });

    describe("#multiFetch", () => {
      const L1 = new LocalStorageDriver();
      const L2 = new LocalStorageDriver();
      const L3 = new LocalStorageDriver();
      const drivers = [L1, L2, L3] as const;
      const subject: CachedFetcher = new CachedFetcher([...drivers]);

      beforeEach(async () => {
        await Promise.all(drivers.map((driver) => driver.flush()));
      });

      context("when cache has cascaded discrepency", () => {
        beforeEach(async () => {
          await L1.setMulti([
            { key: "key:A", value: "A" },
          ]);
          await L2.setMulti([
            { key: "key:A", value: "A-L2" },
            { key: "key:B", value: "B" },
          ]);
          await L3.setMulti([
            { key: "key:A", value: "A-L3" },
            { key: "key:B", value: "B-L3" },
            { key: "key:C", value: "C" },
          ]);
        });

        it("should return cached value, and fill the upwards caches", async () => {
          const res1 = await subject.multiFetch(
            ["A", "B", "C", "D"],
            "key",
            3600,
            async (args) => {
              return args.map(() => "NEW");
            },
          );

          expect(res1).to.deep.eq(["A", "B", "C", "NEW"]);

          expect(await L1.getMulti(["key:A", "key:B", "key:C", "key:D"])).to.be.deep.eq({
            "key:A": "A",
            "key:B": "B",
            "key:C": "C",
            "key:D": "NEW",
          });
          expect(await L2.getMulti(["key:A", "key:B", "key:C", "key:D"])).to.be.deep.eq({
            "key:A": "A-L2",
            "key:B": "B",
            "key:C": "C",
            "key:D": "NEW",
          });
          expect(await L3.getMulti(["key:A", "key:B", "key:C", "key:D"])).to.be.deep.eq({
            "key:A": "A-L3",
            "key:B": "B-L3",
            "key:C": "C",
            "key:D": "NEW",
          });
        });
      });

      it("should fetch only missing sets", async () => {
        const res1 = await subject.multiFetch(
          [1, 2, 3, 4, 5],
          "v1",
          3600,
          async (args) => {
            return args.map((arg) => arg * arg);
          },
        );
        expect(res1).to.deep.eq([1, 4, 9, 16, 25]);

        // it's using same hash key, so should reuse cache for exsiting values
        const res2 = await subject.multiFetch(
          [1, 2, 100, 200, 5],
          ["v1", (arg) => arg],
          3600,
          async (args) => {
            return args.map((arg) => arg + arg);
          },
        );
        expect(res2).to.deep.eq([1, 4, 200, 400, 25]);

        let fetcherCalled = false;
        const res3 = await subject.multiFetch(
          [],
          ["v1", (arg) => arg],
          3600,
          async (args) => {
            fetcherCalled = true;
            return args.map((arg) => arg);
          },
        );
        expect(fetcherCalled).to.be.eq(false);
        expect(res3).to.deep.eq([]);
      });

      it("should cache the value <0>", async () => {
        const res1 = await subject.multiFetch(
          [1, 2, 0],
          "v1",
          3600,
          async (args) => args,
        );
        expect(res1).to.deep.eq([1, 2, 0]);

        const res2 = await subject.multiFetch(
          [1, 2, 0, 0],
          "v1",
          3600,
          async (args) => args.map((__) => 100),
        );
        expect(res2).to.deep.eq([1, 2, 0, 0]);
      });

      it("should cache the value <null>", async () => {
        const res1 = await subject.multiFetch(
          [1, 2, 3, 4],
          "v1",
          3600,
          async (args) => {
            return args.map((i) => {
              if (i % 2 === 0) {
                return null;
              } else {
                return i;
              }
            });
          },
        );
        expect(res1).to.deep.eq([1, null, 3, null]);

        const res2 = await subject.multiFetch(
          [1, 2, 3, 4],
          "v1",
          3600,
          async (args) => args.map((__) => -1),
        );
        expect(res2).to.deep.eq([1, null, 3, null]);
      });

      it("should not cache the value undefined, and revalidate next time", async () => {
        const res1 = await subject.multiFetch(
          [1, 2, 3, 4],
          "v1",
          3600,
          async (args) => {
            return args.map((i) => {
              if (i % 2 === 0) {
                return undefined;
              } else {
                return i;
              }
            });
          },
        );
        expect(res1).to.deep.eq([1, undefined, 3, undefined]);

        const res2 = await subject.multiFetch(
          [1, 2, 3, 4],
          "v1",
          3600,
          async (args) => args.map((__) => -1),
        );
        expect(res2).to.deep.eq([1, -1, 3, -1]);
      });
    });

    describe("#del", () => {
      const drivers: [Driver, Driver] = [
        new LocalStorageDriver(),
        new RedisDriver(process.env.REDIS_URL as string),
      ];
      const subject: CachedFetcher = new CachedFetcher(drivers);

      beforeEach(async () => {
        await Promise.all(drivers.map((driver) => driver.flush()));
      });

      context("when L1/L2 both has data", () => {
        it("should delete all cache", async () => {
          const value = 100;
          const key = "random-key";

          await subject.fetch(key, 60, async () => value);

          // both drivers should have data now
          expect(await drivers[0].get(key)).to.be.eq(value);
          expect(await drivers[1].get(key)).to.be.eq(value);


          await subject.del(key);

          // both drivers should have data now
          expect(await drivers[0].get(key)).to.be.eq(undefined);
          expect(await drivers[1].get(key)).to.be.eq(undefined);
        });
      });
    });
  });

  [
    new RedisDriver(process.env.REDIS_URL as string),
  ].forEach((driver) => {
    context(`with ${driver.constructor.name}`, () => {
      const fetcher = new CachedFetcher([driver]);

      beforeEach(async () => {
        await driver.flush();
      });

      describe("#constructor - keyTransform", () => {
        it("should transform with type=hashing", async () => {
          const subject = new CachedFetcher([driver], { keyTransform: { type: "hashing", algorithm: "md5" }}).keyTransform;
          expect(subject("abc")).to.be.eq("900150983cd24fb0d6963f7d28e17f72");
        });

        it("should transform with type=prefix", async () => {
          const subject = new CachedFetcher([driver], { keyTransform: { type: "prefix", prefix: "service:" }}).keyTransform;
          expect(subject("abc")).to.be.eq("service:abc");
        });

        it("should transform with custom transform", async () => {
          const subject = new CachedFetcher([driver], { keyTransform: (key) => `!!${key}!!`}).keyTransform;
          expect(subject("abc")).to.be.eq("!!abc!!");
        });

        it("should bypass transform as default", async () => {
          const subject = new CachedFetcher([driver], {}).keyTransform;
          expect(subject("abc")).to.be.eq("abc");
        });
      });

      describe("#fetch", () => {
        it("should cache value", async () => {
          const fn = sinon.fake.resolves({ fake: 3 });

          const v1 = await fetcher.fetch("fetch", 60, fn);
          expect(fn.callCount).to.eq(1);
          expect(v1).to.deep.eq({ fake: 3 });

          const v2 = await fetcher.fetch("fetch", 60, fn);
          expect(fn.callCount).to.eq(1);
          expect(v2).to.deep.eq({ fake: 3 });
        });
      });

      describe("#multiFetch", () => {
        it("should fetch only missing sets", async () => {
          const res1 = await fetcher.multiFetch(
            [1, 2, 3, 4, 5],
            "v1",
            3600,
            async (args) => {
              return args.map((arg) => arg * arg);
            },
          );
          expect(res1).to.deep.eq([1, 4, 9, 16, 25]);

          // it's using same hash key, so should reuse cache for exsiting values
          const res2 = await fetcher.multiFetch(
            [1, 2, 100, 200, 5],
            ["v1", (arg) => arg],
            3600,
            async (args) => {
              return args.map((arg) => arg + arg);
            },
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
            },
          );
          expect(fetcherCalled).to.be.eq(false);
          expect(res3).to.deep.eq([]);
        });

        it("should cache the value <0>", async () => {
          const res1 = await fetcher.multiFetch(
            [1, 2, 0],
            "v1",
            3600,
            async (args) => args,
          );
          expect(res1).to.deep.eq([1, 2, 0]);

          const res2 = await fetcher.multiFetch(
            [1, 2, 0, 0],
            "v1",
            3600,
            async (args) => args.map((__) => 100),
          );
          expect(res2).to.deep.eq([1, 2, 0, 0]);
        });

        it("should cache the value <null>", async () => {
          const res1 = await fetcher.multiFetch(
            [1, 2, 3, 4],
            "v1",
            3600,
            async (args) => {
              return args.map((i) => {
                if (i % 2 === 0) {
                  return null;
                } else {
                  return i;
                }
              });
            },
          );
          expect(res1).to.deep.eq([1, null, 3, null]);

          const res2 = await fetcher.multiFetch(
            [1, 2, 3, 4],
            "v1",
            3600,
            async (args) => args.map((__) => -1),
          );
          expect(res2).to.deep.eq([1, null, 3, null]);
        });

        it("should not cache the value undefined, and revalidate next time", async () => {
          const res1 = await fetcher.multiFetch(
            [1, 2, 3, 4],
            "v1",
            3600,
            async (args) => {
              return args.map((i) => {
                if (i % 2 === 0) {
                  return undefined;
                } else {
                  return i;
                }
              });
            },
          );
          expect(res1).to.deep.eq([1, undefined, 3, undefined]);

          const res2 = await fetcher.multiFetch(
            [1, 2, 3, 4],
            "v1",
            3600,
            async (args) => args.map((__) => -1),
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
            },
          )).to.deep.eq([1, 4, 9, 16, 25]);

          await fetcher.multiFetchDelete([1, 2, 3], "v1");

          expect(await fetcher.multiFetch(
            [1, 2, 3, 4, 5],
            "v1",
            3600,
            async (args) => {
              return args.map(() => 0);
            },
          )).to.deep.eq([0, 0, 0, 16, 25]);
        });
      });
    });
  });
});
