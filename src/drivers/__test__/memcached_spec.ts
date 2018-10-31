import { expect } from "chai";

import { MemcachedDriver } from "../memcached";

describe(MemcachedDriver.name, () => {
  describe("#del", () => {
    it("should work", async () => {
      const memcached = new MemcachedDriver(process.env.MEMCACHED_URL, { autoDiscovery: false });

      expect(await memcached.del("Key")).to.be.eq(false);

      await memcached.set("Key", null);
      expect(await memcached.del("Key")).to.be.eq(true);
    });
  });
});
