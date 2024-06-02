import { IVectorMath } from "../VectorMath";

// declare utility class as mocked variable for typecheck :^)
const VectorMath: IVectorMath = null as unknown as IVectorMath;

export type Params = [index_from: number, index_to: number, world_size: number, x: Float64Array, y: Float64Array];

export async function main(params: Params) {
  const [index_from, index_to, world_size, x, y] = params;

  for (let i = index_from; i < index_to; i++) {
    if (x[i] > world_size) {
      x[i] = world_size - 1;
    }

    if (x[i] < 0) {
      x[i] = 1;
    }

    if (y[i] > world_size) {
      y[i] = world_size - 1;
    }

    if (y[i] < 0) {
      y[i] = 1;
    }
  }

  return null;
}
