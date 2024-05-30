/*
 * I need this structure, cause I want array of particles, but
 * each particle contain complex data, so
 * as result I get array of objects, thats
 * not optimized method for storing data for heavy computation, and
 * possible parallelization of calculations
 */
export class ParticleContainer {
  count: number;

  x: Float64Array;
  y: Float64Array;
  z: Float64Array; // but, now uncalculated

  prev_x: Float64Array;
  prev_y: Float64Array;
  prev_z: Float64Array; // but, now uncalculated

  acceleration_x: Float64Array;
  acceleration_y: Float64Array;
  acceleration_z: Float64Array; // but, now uncalculated

  mass: Float64Array;
  radius: Float64Array;

  constructor(count: number) {
    this.count = count;

    this.x = ParticleContainer.make_array(count);
    this.y = ParticleContainer.make_array(count);
    this.z = ParticleContainer.make_array(count);

    this.prev_x = ParticleContainer.make_array(count);
    this.prev_y = ParticleContainer.make_array(count);
    this.prev_z = ParticleContainer.make_array(count);

    this.acceleration_x = ParticleContainer.make_array(count);
    this.acceleration_y = ParticleContainer.make_array(count);
    this.acceleration_z = ParticleContainer.make_array(count);

    this.mass = ParticleContainer.make_array(count);
    this.radius = ParticleContainer.make_array(count);
  }

  static make_array(count: number) {
    return new Float64Array(
      new SharedArrayBuffer(count * Float64Array.BYTES_PER_ELEMENT),
    ).fill(0.0);
  }
}
