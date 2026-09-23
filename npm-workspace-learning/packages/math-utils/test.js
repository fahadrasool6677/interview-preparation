const { describe, it } = require("node:test");
const assert = require("node:assert");
const { add, subtract, multiply } = require("./index.js");

describe("@learning/math-utils", () => {
  it("adds two numbers", () => {
    assert.strictEqual(add(10, 5), 15);
  });

  it("subtracts two numbers", () => {
    assert.strictEqual(subtract(10, 5), 5);
  });

  it("multiplies two numbers", () => {
    assert.strictEqual(multiply(10, 5), 50);
  });
});
