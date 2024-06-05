import { IVectorMath } from "../VectorMath";

// declare utility class as mocked variable for typecheck :^)
const VectorMath: IVectorMath = null as unknown as IVectorMath;

export type Params = [index_from: number, index_to: number, world_size: number, x: Float32Array, y: Float32Array];

export async function main(params: Params) {
  const [index_from, index_to, world_size, x, y] = params;

  for (let i = index_from; i < index_to; i++) {
    if (i >= x.length) continue;

    if (x[i] > world_size - 25) {
      x[i] = world_size - 25;
    }

    if (x[i] < 25) {
      x[i] = 25;
    }

    if (y[i] > world_size - 25) {
      y[i] = world_size - 25;
    }

    if (y[i] < 25) {
      y[i] = 25;
    }
  }

  return null;
}
