import { IVectorMath } from "../VectorMath";

// declare utility class as mocked variable for typecheck :^)
const VectorMath: IVectorMath = null as unknown as IVectorMath;

export type Params = [
  index_from: number,
  index_to: number,
  time_delta_subbed: number,
  x: Float64Array,
  y: Float64Array,
  prev_x: Float64Array,
  prev_y: Float64Array,
  acceleration_x: Float64Array,
  acceleration_y: Float64Array,
];

export async function main(params: Params) {
  const [index_from, index_to, time_delta_subbed, x, y, prev_x, prev_y, acceleration_x, acceleration_y] = params;

  for (let i = index_from; i < index_to; i++) {
    const velocity = VectorMath.subtract([x[i], y[i]], [prev_x[i], prev_y[i]]);

    prev_x[i] = x[i];
    prev_y[i] = y[i];

    const position = VectorMath.add(
      [x[i], y[i]],
      VectorMath.add(velocity, VectorMath.multiply([acceleration_x[i], acceleration_y[i]], time_delta_subbed)),
    );

    acceleration_x[i] = 0;
    acceleration_y[i] = 0;

    x[i] = position[0];
    y[i] = position[1];
  }

  return null;
}
