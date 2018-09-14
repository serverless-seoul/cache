import { expect } from "chai";

import { MemcachedDriver } from "../memcached";

describe(MemcachedDriver.name, () => {
  describe("#del", () => {
    it("should work", async () => {
      const memcached = new MemcachedDriver(process.env.MEMCACHED_URL, { autoDiscovery: false });

      expect(await memcached.del("Key")).to.be.eq(false);

      await memcached.set("Key1", null);
      console.log("RESULT::", await memcached.get("Key1"));
      console.log("RESULT::", await memcached.get("Key"));
      console.log("RESULT1::", await memcached.getMulti(["Key1"]));
      console.log("RESULT1::", await memcached.getMulti(["Key"]));
      expect(await memcached.del("Key")).to.be.eq(true);
    });
  });
})