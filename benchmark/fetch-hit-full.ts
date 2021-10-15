import { cronometro, Test } from "cronometro";
import * as debug from "debug";

import {
  RedisDriver as DeprecatedSingleDriver,
  RedisClusterDriver as DeprecatedClusterDriver,
  MemcachedFetcher as DeprecatedFetcher,
} from "memcached-typed";
import {
  RedisDriver as DevelopSingleDriver,
  RedisClusterDriver as DevelopClusterDriver,
  CachedFetcher as DevelopFetcher,
} from "../src";
import { isMainThread } from "worker_threads";

type Branch = "deprecated" | "develop";
type Node = "single" | "cluster";
type Version = 5 | 6;
type Pipelining = boolean;

const REDIS_V5_SINGLE_ENDPOINT = "redis://redis-bench-v5-noncluster-1x2.zkauci.ng.0001.apn2.cache.amazonaws.com:6379";
const REDIS_V5_CLUSTER_ENDPOINT = "redis://redis-bench-v5-cluster-2x2.zkauci.clustercfg.apn2.cache.amazonaws.com:6379";
const REDIS_V6_SINGLE_ENDPOINT = "redis://redis-bench-v6-noncluster-1x2.zkauci.ng.0001.apn2.cache.amazonaws.com:6379";
const REDIS_V6_CLUSTER_ENDPOINT = "redis://redis-bench-v6-cluster-2x2.zkauci.clustercfg.apn2.cache.amazonaws.com:6379";

const iterations = parseInt(process.env.ITERATIONS || "10000", 10);
const key = "fetch-full-hit";

let driver: DeprecatedSingleDriver
  | DeprecatedClusterDriver
  | DevelopSingleDriver
  | DevelopClusterDriver;

let fetcher: DeprecatedFetcher | DevelopFetcher;

const fixedWidth = (input: string, length: number) => input.padEnd(length).slice(0, length);

const createSuite = (branch: Branch, node: Node, version: Version, pipelining: Pipelining): [string, Test] => {
  const log = debug([
    "runner",
    branch,
    node,
    `redis${version}`,
    `pipelining-${pipelining ? 'on' : 'off'}`,
  ].join(":"));

  return [
    [
      fixedWidth(branch, 12),
      fixedWidth(node, 8),
      `redis ${version}`,
      `pipelining ${pipelining ? 'on' : 'off'}`,
    ].join(" | "),
    {
      async before() {
        log("connecting");
        const Driver =
          branch === "deprecated" && node === "single" ? DeprecatedSingleDriver :
          branch === "deprecated" && node === "cluster" ? DeprecatedClusterDriver :
          branch === "develop" && node === "single" ? DevelopSingleDriver :
          branch === "develop" && node === "cluster" ? DevelopClusterDriver :
          null;

        const Fetcher =
          branch === "deprecated" ? DeprecatedFetcher :
          branch === "develop" ? DeprecatedFetcher :
          null;

        const endpoint =
          version === 5 && node === "single" ? REDIS_V5_SINGLE_ENDPOINT :
          version === 5 && node === "cluster" ? REDIS_V5_CLUSTER_ENDPOINT :
          version === 6 && node === "single" ? REDIS_V6_SINGLE_ENDPOINT :
          version === 6 && node === "cluster" ? REDIS_V6_CLUSTER_ENDPOINT :
          null;

        if (!Driver || !Fetcher || !endpoint) {
          throw new Error("Unknown Driver and endpoint");
        }

        driver = new Driver(endpoint, { ioredis: { lazyConnect: true, enableAutoPipelining: pipelining } })
        await driver.client.connect();
        log("connected!");

        fetcher = new Fetcher(driver);
        await (fetcher.fetch as any)(key, 3600, async () => ({
          cachedAt: Date.now(),
        }));
      },
      async after() {
        log("disconnecting");
        await driver.end();
        log("disconnected!");
      },
      test() {
        return (fetcher.fetch as any)(key, 3600, async () => ({
          cachedAt: Date.now(),
        }));
      },
    },
  ];
};

const createMatrix = (branches: Branch[], nodes: Node[], versions: Version[], pipelinings: Pipelining[]): [string, Test][] => {
  const collection: [string, Test][] = [];

  for (const branch of branches) {
    for (const node of nodes) {
      for (const version of versions) {
        for (const pipelining of pipelinings) {
          collection.push(createSuite(branch, node, version, pipelining));
        }
      }
    }
  }

  return collection;
}

const suites: Record<string, Test> = Object.fromEntries([
  ...createMatrix(["deprecated"], ["single", "cluster"], [5, 6], [false]),
  ...createMatrix(["develop"], ["single", "cluster"], [5, 6], [true, false]),
]);

if (isMainThread) {
  console.log("Benchmarking: Fetch single item (%d iterations, 100% hit ratio)", iterations); // tslint:disable-line
}

cronometro(suites, {
  iterations,
  print: { compare: true },
});
