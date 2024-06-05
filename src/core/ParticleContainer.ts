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

  pairs_for_resolve: Int32Array[];

  indexes_sorted_by_x: Int32Array;
  x_b_starts: Float32Array;
  x_b_ends: Float32Array;
  y_b_starts: Float32Array;
  y_b_ends: Float32Array;

  constructor(count: number, cpu_cores: number) {
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

    // fixme: here we could meet case, when one particle can contain more than
    // 100 particles for collide resolving
    this.pairs_for_resolve = new Array(cpu_cores);

    for (let i = 0; i < cpu_cores; i++) {
      this.pairs_for_resolve[i] = ParticleContainer.make_int_array(count * 500 * 2);
    }

    this.indexes_sorted_by_x = ParticleContainer.make_int_array(count);
    for (let i = 0; i < count; i++) {
      this.indexes_sorted_by_x[i] = i;
    }

    this.x_b_starts = ParticleContainer.make_float_array(count);
    this.x_b_ends = ParticleContainer.make_float_array(count);
    this.y_b_starts = ParticleContainer.make_float_array(count);
    this.y_b_ends = ParticleContainer.make_float_array(count);
  }

  static make_float_array(count: number) {
    return new Float32Array(new SharedArrayBuffer(count * Float32Array.BYTES_PER_ELEMENT)).fill(0.0);
  }

  static make_int_array(count: number) {
    return new Int32Array(new SharedArrayBuffer(count * Int32Array.BYTES_PER_ELEMENT)).fill(0.0);
  }
}
