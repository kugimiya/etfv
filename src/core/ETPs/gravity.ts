import { IVectorMath } from "../VectorMath";

// declare utility class as mocked variable for typecheck :^)
const VectorMath: IVectorMath = null as unknown as IVectorMath;

export type Params = [
  index_i: number,
  count: number,
  g_constant: number,
  x: Float64Array,
  y: Float64Array,
  acceleration_x: Float64Array,
  acceleration_y: Float64Array,
  mass: Float64Array,
];

export async function main(params: Params) {
  const [index_i, count, g_constant, x, y, acceleration_x, acceleration_y, mass] = params;

  for (let j = index_i; j < count; j++) {
    if (index_i === j) continue;

    const velocity_squared = VectorMath.lengthSquared(VectorMath.subtract([x[index_i], y[index_i]], [x[j], y[j]]));
    const force = g_constant * ((mass[index_i] * mass[j]) / velocity_squared);
    const acceleration = force / Math.sqrt(velocity_squared);

    const particle1_acceleration = VectorMath.add(
      [acceleration_x[index_i], acceleration_y[index_i]],
      VectorMath.multiply(VectorMath.subtract([x[j], y[j]], [x[index_i], y[index_i]]), acceleration),
    );

    acceleration_x[index_i] = (acceleration_x[index_i] + particle1_acceleration[0]) / 2;
    acceleration_y[index_i] = (acceleration_y[index_i] + particle1_acceleration[1]) / 2;

    const particle2_acceleration = VectorMath.add(
      [acceleration_x[j], acceleration_y[j]],
      VectorMath.multiply(VectorMath.subtract([x[index_i], y[index_i]], [x[j], y[j]]), acceleration),
    );

    acceleration_x[j] = (acceleration_x[j] + particle2_acceleration[0]) / 2;
    acceleration_y[j] = (acceleration_y[j] + particle2_acceleration[1]) / 2;
  }

  return null;
}
