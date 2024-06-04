import { IVectorMath } from "../VectorMath";
import { IHashMath } from "../HashMath";

// declare utility class as mocked variable for typecheck :^)
const VectorMath: IVectorMath = null as unknown as IVectorMath;
const HashMath: IHashMath = null as unknown as IHashMath;

export type Params = [
  index_from: number,
  index_to: number,
  time_delta_subbed: number,
  chunk_size: number,
  x: Float32Array,
  y: Float32Array,
  prev_x: Float32Array,
  prev_y: Float32Array,
  acceleration_x: Float32Array,
  acceleration_y: Float32Array,
  chunk_index_store: Int32Array,
];

export async function main(params: Params) {
  const [
    index_from,
    index_to,
    time_delta_subbed,
    chunk_size,
    x,
    y,
    prev_x,
    prev_y,
    acceleration_x,
    acceleration_y,
    chunk_index_store,
  ] = params;

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

    chunk_index_store[i] = HashMath.get_hash(
      Math.floor(position[0] / chunk_size),
      Math.floor(position[1] / chunk_size),
    );
  }

  return null;
}
