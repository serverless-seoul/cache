import { expect } from "chai";

import { RedisDriver } from "../redis";

describe(RedisDriver.name, () => {
  it("should work", async () => {
    const redis = new RedisDriver(process.env.REDIS_URL!);
    const key = "foo";
    const value = "bar";

    expect(await redis.get(key)).to.be.eq(undefined);
    expect(await redis.del(key)).to.be.eq(false);
    await redis.set(key, value);

    expect(await redis.get(key)).to.be.eq(value);
    expect(await redis.del(key)).to.be.eq(true);

    const complexInput = {
      complex: true,
      types: {
        boolean: true,
        number: 12345,
        string: "wow",
        null: null,
      },
    };

    await redis.set(key, complexInput);
    expect(await redis.get(key)).to.be.deep.eq(complexInput);

    await redis.set(key, "non-serialized value");
    expect(await redis.get(key)).to.be.eq("non-serialized value");
  });
});
