import { IVectorMath } from "../VectorMath";
import { IHashMath } from "../HashMath";

// declare utility class as mocked variable for typecheck :^)
const VectorMath: IVectorMath = null as unknown as IVectorMath;
const HashMath: IHashMath = null as unknown as IHashMath;

export type Params = [
  collide_responsibility: number,
  center_chunk_x: number[],
  center_chunk_y: number[],
  x: Float32Array,
  y: Float32Array,
  mass: Float32Array,
  radius: Float32Array,
  chunk_index_store: Int32Array,
];

export async function main(params: Params) {
  const [collide_responsibility, center_chunk_x, center_chunk_y, x, y, mass, radius, chunk_index_store] = params;

  const check_n_resolve = (i: number, j: number) => {
    // check n resolve collisions
    const velocity = VectorMath.subtract([x[i], y[i]], [x[j], y[j]]);

    const distance_squared = VectorMath.lengthSquared(velocity);
    const distance_minimal = radius[i] + radius[j];

    if (distance_squared <= distance_minimal * distance_minimal) {
      const distance = Math.sqrt(distance_squared);
      const diff = VectorMath.divide(velocity, distance);

      const common_mass = mass[i] + mass[j];
      const particle1_mass_ratio = mass[i] / common_mass;
      const particle2_mass_ratio = mass[j] / common_mass;

      const delta = collide_responsibility * (distance - distance_minimal);

      // Upd positions
      const particle1_position = VectorMath.subtract(
        [x[i], y[i]],
        VectorMath.divide(VectorMath.multiply(diff, particle2_mass_ratio * delta), 2),
      );

      x[i] = particle1_position[0];
      y[i] = particle1_position[1];

      const particle2_position = VectorMath.add(
        [x[j], y[j]],
        VectorMath.divide(VectorMath.multiply(diff, particle1_mass_ratio * delta), 2),
      );

      x[j] = particle2_position[0];
      y[j] = particle2_position[1];
    }
  };

  const indexied = Array.from(chunk_index_store)
    .map((v, i) => [v, i])
    .sort((a, b) => a[0] - b[0]);

  for (let chunk_i = 0; chunk_i < center_chunk_x.length; chunk_i++) {
    const hashes = [
      HashMath.get_hash(center_chunk_x[chunk_i] - 1, center_chunk_y[chunk_i] - 1),
      HashMath.get_hash(center_chunk_x[chunk_i] - 1, center_chunk_y[chunk_i]),
      HashMath.get_hash(center_chunk_x[chunk_i] - 1, center_chunk_y[chunk_i] + 1),
      HashMath.get_hash(center_chunk_x[chunk_i], center_chunk_y[chunk_i] - 1),
      HashMath.get_hash(center_chunk_x[chunk_i], center_chunk_y[chunk_i]),
      HashMath.get_hash(center_chunk_x[chunk_i], center_chunk_y[chunk_i] + 1),
      HashMath.get_hash(center_chunk_x[chunk_i] + 1, center_chunk_y[chunk_i] - 1),
      HashMath.get_hash(center_chunk_x[chunk_i] + 1, center_chunk_y[chunk_i]),
      HashMath.get_hash(center_chunk_x[chunk_i] + 1, center_chunk_y[chunk_i] + 1),
    ];

    const target_particles_indexes = indexied
      .filter(
        ([idx]) =>
          idx === hashes[0] ||
          idx === hashes[1] ||
          idx === hashes[2] ||
          idx === hashes[3] ||
          idx === hashes[4] ||
          idx === hashes[5] ||
          idx === hashes[6] ||
          idx === hashes[7] ||
          idx === hashes[8],
      )
      .map((v) => v[1]);

    if (target_particles_indexes.length < 2) continue;

    for (let i = 0; i < target_particles_indexes.length; i++) {
      for (let j = i; j < target_particles_indexes.length; j++) {
        if (target_particles_indexes[i] === target_particles_indexes[j]) continue;
        check_n_resolve(target_particles_indexes[i], target_particles_indexes[j]);
      }
    }
  }

  return null;
}
