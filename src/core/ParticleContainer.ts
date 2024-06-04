/*
 * I need this structure, cause I want array of particles, but
 * each particle contain complex data, so
 * as result I get array of objects, thats
 * not optimized method for storing data for heavy computation, and
 * possible parallelization of calculations
 */
export class ParticleContainer {
  count: number;

  x: Float32Array;
  y: Float32Array;
  z: Float32Array; // but, now uncalculated

  prev_x: Float32Array;
  prev_y: Float32Array;
  prev_z: Float32Array; // but, now uncalculated

  acceleration_x: Float32Array;
  acceleration_y: Float32Array;
  acceleration_z: Float32Array; // but, now uncalculated

  mass: Float32Array;
  radius: Float32Array;

  chunk_index_store: Int32Array;

  constructor(count: number) {
    this.count = count;

    this.x = ParticleContainer.make_float_array(count);
    this.y = ParticleContainer.make_float_array(count);
    this.z = ParticleContainer.make_float_array(count);

    this.prev_x = ParticleContainer.make_float_array(count);
    this.prev_y = ParticleContainer.make_float_array(count);
    this.prev_z = ParticleContainer.make_float_array(count);

    this.acceleration_x = ParticleContainer.make_float_array(count);
    this.acceleration_y = ParticleContainer.make_float_array(count);
    this.acceleration_z = ParticleContainer.make_float_array(count);

    this.mass = ParticleContainer.make_float_array(count);
    this.radius = ParticleContainer.make_float_array(count);

    this.chunk_index_store = ParticleContainer.make_int_array(count);
  }

  static make_float_array(count: number) {
    return new Float32Array(new SharedArrayBuffer(count * Float32Array.BYTES_PER_ELEMENT)).fill(0.0);
  }

  static make_int_array(count: number) {
    return new Int32Array(new SharedArrayBuffer(count * Int32Array.BYTES_PER_ELEMENT)).fill(0.0);
  }
}
