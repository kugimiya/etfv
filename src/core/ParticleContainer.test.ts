import assert from "node:assert";
import { describe, it } from "node:test";
import { ParticleContainer } from "./ParticleContainer";

describe("Inspect .make_array()", () => {
  it("returns correct array", () => {
    assert.equal(2, ParticleContainer.make_float_array(2).length);
  });

  it("fails when count = -8", () => {
    assert.throws(() => ParticleContainer.make_float_array(-8));
  });
});

describe("inspect constructing", () => {
  const elm_count = 24;

  it("constructs", () => {
    assert.doesNotThrow(() => new ParticleContainer(elm_count, 1));
  });

  it(`each array contains ${elm_count} elements`, () => {
    const container = new ParticleContainer(elm_count, 1);

    assert.deepEqual(new Array(8).fill(elm_count), [
      container.x.length,
      container.y.length,
      container.z.length,
      container.prev_x.length,
      container.prev_y.length,
      container.prev_z.length,
      container.acceleration_x.length,
      container.acceleration_y.length,
      container.acceleration_z.length,
      container.mass.length,
      container.radius.length,
    ]);
  });

  it("each array dont copy of one array", () => {
    const container = new ParticleContainer(elm_count, 1);

    assert.notEqual(container.x, container.y);
    assert.notEqual(container.y, container.z);
    assert.notEqual(container.z, container.prev_x);
    assert.notEqual(container.prev_x, container.prev_y);
    assert.notEqual(container.prev_y, container.prev_z);
    assert.notEqual(container.prev_z, container.mass);
    assert.notEqual(container.mass, container.radius);
    assert.notEqual(container.x, container.radius);
    assert.notEqual(container.radius, container.acceleration_x);
    assert.notEqual(container.acceleration_x, container.acceleration_y);
    assert.notEqual(container.acceleration_y, container.acceleration_z);
  });
});
