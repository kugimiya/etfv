import { IVectorMath } from "../VectorMath";

// declare utility class as mocked variable for typecheck :^)
const VectorMath: IVectorMath = null as unknown as IVectorMath;

export type Params = [
  from: number,
  to: number,
  particles_count: number,
  x_b_ends: Float32Array,
  x_b_starts: Float32Array,
  y_b_ends: Float32Array,
  y_b_starts: Float32Array,
  indexes_sorted_by_x: Int32Array,
  pairs_for_resolve: Int32Array,
];

export async function main(params: Params) {
  const [
    from,
    to,
    particles_count,
    x_b_ends,
    x_b_starts,
    y_b_ends,
    y_b_starts,
    indexes_sorted_by_x,
    pairs_for_resolve,
  ] = params;

  let total_calcs = 0;
  let inc = 0;

  for (let bound_index = from; bound_index < to; bound_index++) {
    for (let i = bound_index + 1; i < particles_count; i++) {
      if (i >= particles_count) break;

      if (x_b_ends[bound_index] < x_b_starts[i]) {
        // next bounds check unnecessary
        break;
      } else {
        // x's in bound
        total_calcs += 1;
        const y_bounds_down = y_b_ends[bound_index] < y_b_starts[i] && y_b_starts[bound_index] < y_b_ends[i];
        const y_bounds_up = y_b_starts[bound_index] < y_b_ends[i] && y_b_ends[bound_index] > y_b_starts[i];

        if (y_bounds_down || y_bounds_up) {
          // y's in bound
          pairs_for_resolve[inc] = indexes_sorted_by_x[bound_index];
          pairs_for_resolve[inc + 1] = indexes_sorted_by_x[i];
          inc += 2;
        }
      }
    }
  }

  return [inc, total_calcs] as [number, number];
}
