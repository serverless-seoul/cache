import { expect } from "chai";

import { LocalStorageDriver } from "../local_storage";

describe(LocalStorageDriver.name, () => {
  let subject: LocalStorageDriver;
  beforeEach(() => {
    subject = new LocalStorageDriver();
  });

  describe("#get", () => {
    it("should return cached value", async () => {
      await subject.set("A", 100);
      expect(await subject.get("A")).to.be.eq(100);
    });

    it("should return undefined for missing keys", async () => {
      expect(await subject.get("A")).to.be.eq(undefined);
    });

    it("should expire value if TTL is up", async () => {
      await subject.set("A", 100, 1);
      await new Promise((resolve) => setTimeout(resolve, 0.6 * 1000));
      expect(await subject.get("A")).to.be.eq(100, "should not be expired after 0.6 second");
      await new Promise((resolve) => setTimeout(resolve, 0.6 * 1000));
      expect(await subject.get("A")).to.be.eq(undefined, "should be expired after 1.2 second");
    });
  });

  describe.skip("#set", () => {});

  describe("#del", () => {
    it("should delete value", async () => {
      await subject.set("A", 100);
      expect(await subject.get("A")).to.be.eq(100);
      expect(await subject.del("A")).to.be.eq(true);
      expect(await subject.get("A")).to.be.eq(undefined);
    });
  });

  describe("#getMulti", () => {
    it("should return cached value", async () => {
      await subject.set("A", 100);
      await subject.set("B", 200);
      await subject.set("C", 300);

      expect(await subject.getMulti(["A", "B", "C", "D"])).to.be.deep.eq({
        A: 100,
        B: 200,
        C: 300,
        D: undefined,
      });
    });
  });
});
