import { cronometro, Test } from "cronometro";
import * as debug from "debug";

import {
  RedisDriver,
  RedisClusterDriver,
  MemcachedFetcher,
} from "../src";
import { isMainThread } from "worker_threads";

type Node = "single" | "cluster";
type Version = 5 | 6;
type Pipelining = boolean;

const REDIS_V5_SINGLE_ENDPOINT = "redis://redis-bench-v5-noncluster-1x2.zkauci.ng.0001.apn2.cache.amazonaws.com:6379";
const REDIS_V5_CLUSTER_ENDPOINT = "redis://redis-bench-v5-cluster-2x2.zkauci.clustercfg.apn2.cache.amazonaws.com:6379";
const REDIS_V6_SINGLE_ENDPOINT = "redis://redis-bench-v6-noncluster-1x2.zkauci.ng.0001.apn2.cache.amazonaws.com:6379";
const REDIS_V6_CLUSTER_ENDPOINT = "redis://redis-bench-v6-cluster-2x2.zkauci.clustercfg.apn2.cache.amazonaws.com:6379";

const iterations = parseInt(process.env.ITERATIONS || "10000", 10);
const batchSize = parseInt(process.env.BATCH_SIZE || "100", 10);

const fixedWidth = (input: string, length: number) => input.padEnd(length).slice(0, length);

const createSuite = (node: Node, version: Version, pipelining: Pipelining): [string, Test] => {
  const log = debug([
    "runner",
    node,
    `redis${version}`,
    `pipelining-${pipelining ? "on" : "off"}`,
  ].join(":"));

  let driver: RedisDriver | RedisClusterDriver;
  let fetcher: MemcachedFetcher;

  const args = Array.from(new Array(batchSize)).map(() => Math.floor(Date.now() * Math.random()));

  return [
    [
      fixedWidth("develop", 12),
      fixedWidth(node, 8),
      `redis ${version}`,
      `pipelining ${pipelining ? "on" : "off"}`,
    ].join(" | "),
    {
      async before() {
        log("connecting");
        const Driver = node === "cluster"
          ? RedisClusterDriver
          : RedisDriver;

        const endpoint =
          version === 5 && node === "single" ? REDIS_V5_SINGLE_ENDPOINT :
          version === 5 && node === "cluster" ? REDIS_V5_CLUSTER_ENDPOINT :
          version === 6 && node === "single" ? REDIS_V6_SINGLE_ENDPOINT :
          version === 6 && node === "cluster" ? REDIS_V6_CLUSTER_ENDPOINT :
          null;

        if (!Driver || !endpoint) {
          throw new Error("Unknown Driver and endpoint");
        }

        driver = new Driver(endpoint, {
          ioredis: {
            enableAutoPipelining: pipelining,
            lazyConnect: true,
          },
        });
        await driver.client.connect();
        fetcher = new MemcachedFetcher(driver);
      },
      async after() {
        await driver.client.quit();
      },
      async test() {
        await fetcher.multiFetch(
          args,
          `multiFetch-half-${Math.floor(Date.now() * Math.random())}`,
          3600,
          async (missingItems: any[]) => missingItems.map(() => ({
            cachedAt: Date.now(),
          })),
        );
      },
    },
  ];
};

const createMatrix = (nodes: Node[], versions: Version[], pipelinings: Pipelining[]): [string, Test][] => {
  const collection: [string, Test][] = [];

  for (const node of nodes) {
    for (const version of versions) {
      for (const pipelining of pipelinings) {
        collection.push(createSuite(node, version, pipelining));
      }
    }
  }

  return collection;
}

const suites: Record<string, Test> = Object.fromEntries([
  ...createMatrix(["single", "cluster"], [5, 6], [true, false]),
]);

if (isMainThread) {
  console.log("Benchmarking: Fetch multiple items (develop only, %d iterations, %d keys, 0% hit ratio)", iterations, batchSize); // tslint:disable-line
}

cronometro(suites, {
  iterations,
  print: { compare: true },
});
