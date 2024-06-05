import { IVectorMath } from "../VectorMath";

// declare utility class as mocked variable for typecheck :^)
const VectorMath: IVectorMath = null as unknown as IVectorMath;

export type Params = [
  collide_responsibility: number,
  total_bounds_found: number,
  from: number,
  to: number,
  check_pairs: Int32Array,
  x: Float32Array,
  y: Float32Array,
  mass: Float32Array,
  radius: Float32Array,
];

export async function main(params: Params) {
  const [collide_responsibility, total_bounds_found, from, to, check_pairs, x, y, mass, radius] = params;

  for (let pair_start = from; pair_start <= to; pair_start += 1) {
    if (pair_start >= total_bounds_found) break;

    const i = check_pairs[pair_start * 2];
    const j = check_pairs[pair_start * 2 + 1];

    if (i === j) continue;

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
  }

  return null;
}
