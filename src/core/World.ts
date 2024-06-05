import { cpus } from "node:os";
import { readFileSync } from "node:fs";
import { ETP } from "etp-ts";
import { ParticleContainer } from "./ParticleContainer";
import { main as gravity_etps, Params as GravityETPsParams } from "./ETPs/gravity";
import { main as upd_pos_etps, Params as UpdPosETPsParams } from "./ETPs/upd_pos";
import { main as apply_constr_etps, Params as ApplCnstrETPsParams } from "./ETPs/apply_constraints";
import { main as collider_bounded_etps, Params as ColliderBoundedETPsParams } from "./ETPs/resolve_collisions_bounded";
import { main as bound_calc_etp, Params as BoundCalcETPsParams } from "./ETPs/bound_calculator";

type WorldParams = {
  particles_count: number;
  world_size?: number;
  g_constant?: number;
  sub_stepping?: number;
  time_delta?: number;
  collide_responsibility?: number;
  chunk_size?: number;
  do_collisions_resolving?: boolean;
};

const CPU_CORES = cpus().length;
const ETP_DEPS = [readFileSync(`${__dirname}/VectorMath.js`).toString()].join("\n");

export class World {
  etp_gravity: ETP<GravityETPsParams, null>;
  etp_upd_pos: ETP<UpdPosETPsParams, null>;
  etp_apply_constraints: ETP<ApplCnstrETPsParams, null>;
  etp_collider_bounded: ETP<ColliderBoundedETPsParams, null>;
  etp_bound_calc: ETP<BoundCalcETPsParams, [number, number]>;
  particles: ParticleContainer;

  world_size: number;
  g_constant: number;
  sub_stepping: number;
  time_delta: number;
  time_delta_subbed: number;
  collide_responsibility: number;
  chunk_size: number;

  do_collisions_resolving: boolean;

  profiling = false;

  constructor({
    particles_count,
    world_size,
    g_constant,
    sub_stepping,
    time_delta,
    collide_responsibility,
    chunk_size,
    do_collisions_resolving,
  }: WorldParams) {
    this.particles = new ParticleContainer(particles_count, CPU_CORES);
    this.etp_gravity = new ETP(CPU_CORES, gravity_etps, ETP_DEPS);
    this.etp_upd_pos = new ETP(CPU_CORES, upd_pos_etps, ETP_DEPS);
    this.etp_apply_constraints = new ETP(CPU_CORES, apply_constr_etps, ETP_DEPS);
    this.etp_collider_bounded = new ETP(CPU_CORES, collider_bounded_etps, ETP_DEPS);
    this.etp_bound_calc = new ETP(CPU_CORES, bound_calc_etp, ETP_DEPS);

    this.world_size = world_size || 1024;
    this.g_constant = g_constant || 6.67445;
    this.sub_stepping = sub_stepping || 8;
    this.time_delta = time_delta || 0.01;
    this.time_delta_subbed = this.time_delta / this.sub_stepping;
    this.collide_responsibility = collide_responsibility || 0.375;
    this.chunk_size = chunk_size || 2;

    this.do_collisions_resolving = do_collisions_resolving === undefined ? true : do_collisions_resolving;
  }

  randomize_particles(
    mass_multiplier: number,
    radius: number,
    x_random: number,
    y_random: number,
    x_vel_mod: number,
    y_vel_mod: number,
  ) {
    const center = this.world_size / 2;

    for (let i = 0; i < this.particles.count; i++) {
      this.particles.mass[i] = mass_multiplier;
      this.particles.radius[i] = radius;

      this.particles.x[i] = (Math.random() - 0.5) * x_random;
      this.particles.y[i] = (Math.random() - 0.5) * y_random;

      this.particles.x[i] = this.particles.x[i] + center;
      this.particles.y[i] = this.particles.y[i] + center;

      this.particles.prev_x[i] = this.particles.x[i] - (Math.random() - 0.5) * x_vel_mod;
      this.particles.prev_y[i] = this.particles.y[i] - (Math.random() - 0.5) * y_vel_mod;
    }
  }

  async update() {
    try {
      await this.update_gravity_acc();
      await this.update_particles_pos();

      if (this.do_collisions_resolving) {
        let collisions_count = 0;
        let calcs = 0;
        for (let i = 0; i < this.sub_stepping; i++) {
          await this.resolve_space_constraints();
          const [founded, total] = await this.resolve_collisions();
          await this.update_particles_pos();
          collisions_count += founded;
          calcs += total;
        }
        this.profiling &&
          console.log(
            `world: resolve_collisions: collisions founded: ${Math.round(collisions_count)}, total: ${Math.round(calcs)}`,
          );
      }
    } catch (e) {
      console.error(e);
    }
  }

  async resolve_collisions() {
    this.profiling && console.time("world: resolve_collisions: multi thread calc");
    this.profiling && console.time("world: resolve_collisions:   bounds search");

    let inc = 0;
    let total_calcs = 0;
    let calc_results: [number, number][] = [];

    // bounds search
    const multithread_calc = true;
    if (multithread_calc) {
      const calc_range_base = Math.ceil(this.particles.count / CPU_CORES);
      const calc_promises: Promise<[number, number]>[] = [];

      for (let sub_i = 0; sub_i < CPU_CORES; sub_i++) {
        calc_promises.push(
          this.etp_bound_calc.do_work([
            sub_i * calc_range_base,
            (sub_i + 1) * calc_range_base,
            this.particles.count,
            this.particles.x_b_ends,
            this.particles.x_b_starts,
            this.particles.y_b_ends,
            this.particles.y_b_starts,
            this.particles.indexes_sorted_by_x,
            this.particles.pairs_for_resolve[sub_i],
          ]),
        );
      }

      calc_results = await Promise.all(calc_promises);
      calc_results.forEach((data) => {
        (inc += data[0]), (total_calcs += data[1]);
      });
    } else {
      for (let bound_index = 0; bound_index < this.particles.count - 1; bound_index++) {
        for (let i = bound_index + 1; i < this.particles.count; i++) {
          if (i >= this.particles.count) break;
          if (this.particles.x_b_ends[bound_index] < this.particles.x_b_starts[i]) {
            // next bounds check unnecessary
            break;
          } else {
            // x's in bound
            total_calcs += 1;
            const y_bounds_down =
              this.particles.y_b_ends[bound_index] < this.particles.y_b_starts[i] &&
              this.particles.y_b_starts[bound_index] < this.particles.y_b_ends[i];
            const y_bounds_up =
              this.particles.y_b_starts[bound_index] < this.particles.y_b_ends[i] &&
              this.particles.y_b_ends[bound_index] > this.particles.y_b_starts[i];
            if (y_bounds_down || y_bounds_up) {
              // y's in bound
              this.particles.pairs_for_resolve[0][inc] = this.particles.indexes_sorted_by_x[bound_index];
              this.particles.pairs_for_resolve[0][inc + 1] = this.particles.indexes_sorted_by_x[i];
              inc += 2;
            }
          }
        }
      }
    }

    this.profiling && console.timeEnd("world: resolve_collisions:   bounds search");

    // multithreaded resolving
    this.profiling && console.time("world: resolve_collisions:   resolving");
    const processing_range_base = Math.ceil(inc / 2 / CPU_CORES);
    const promises: Promise<null>[] = [];

    for (let sub_i = 0; sub_i < CPU_CORES; sub_i++) {
      promises.push(
        this.etp_collider_bounded.do_work([
          this.collide_responsibility,
          multithread_calc ? calc_results[sub_i][0] / 2 : inc / 2,
          multithread_calc ? 0 : sub_i * processing_range_base,
          multithread_calc ? calc_results[sub_i][0] : (sub_i + 1) * processing_range_base,
          this.particles.pairs_for_resolve[multithread_calc ? sub_i : 0],
          this.particles.x,
          this.particles.y,
          this.particles.mass,
          this.particles.radius,
        ]),
      );
    }

    await Promise.all(promises);

    for (let i = 0; i < this.particles.pairs_for_resolve.length; i++) {
      this.particles.pairs_for_resolve[i].fill(0);
    }

    this.profiling && console.timeEnd("world: resolve_collisions:   resolving");
    this.profiling && console.timeEnd("world: resolve_collisions: multi thread calc");
    return [inc / 2, total_calcs];
  }

  async update_particles_pos() {
    const processing_range_base = Math.ceil(this.particles.count / CPU_CORES);
    const promises: Promise<null>[] = [];

    for (let sub_i = 0; sub_i < CPU_CORES; sub_i++) {
      promises.push(
        this.etp_upd_pos.do_work([
          sub_i * processing_range_base,
          (sub_i + 1) * processing_range_base,
          this.time_delta_subbed,
          this.particles.x,
          this.particles.y,
          this.particles.prev_x,
          this.particles.prev_y,
          this.particles.acceleration_x,
          this.particles.acceleration_y,
        ]),
      );
    }

    await Promise.all(promises);

    // bounds calculations for collision resolver
    this.particles.indexes_sorted_by_x.sort((a, b) => this.particles.x[a] - this.particles.x[b]);

    // TODO: this has parallelize potential?
    this.particles.indexes_sorted_by_x.forEach((mapped, index) => {
      this.particles.x_b_starts[index] = this.particles.x[mapped] - this.particles.radius[mapped];
      this.particles.x_b_ends[index] = this.particles.x[mapped] + this.particles.radius[mapped];
      this.particles.y_b_starts[index] = this.particles.y[mapped] - this.particles.radius[mapped];
      this.particles.y_b_ends[index] = this.particles.y[mapped] + this.particles.radius[mapped];
    });
  }

  /*
   * NOTE: It's parrallelized bruteforce method
   */
  async update_gravity_acc() {
    for (let i = 0; i < this.particles.count; i += CPU_CORES) {
      const promises: Promise<null>[] = [];

      for (let sub_i = i; sub_i < CPU_CORES; sub_i++) {
        if (sub_i > this.particles.count - 1) continue;

        promises.push(
          this.etp_gravity.do_work([
            sub_i,
            this.particles.count,
            this.g_constant,
            this.particles.x,
            this.particles.y,
            this.particles.acceleration_x,
            this.particles.acceleration_y,
            this.particles.mass,
          ]),
        );
      }

      await Promise.all(promises);
    }
  }

  async resolve_space_constraints() {
    const processing_range_base = Math.ceil(this.particles.count / CPU_CORES);
    const promises: Promise<null>[] = [];

    for (let sub_i = 0; sub_i < CPU_CORES; sub_i++) {
      promises.push(
        this.etp_apply_constraints.do_work([
          sub_i * processing_range_base,
          (sub_i + 1) * processing_range_base,
          this.world_size,
          this.particles.x,
          this.particles.y,
        ]),
      );
    }

    await Promise.all(promises);
  }
}
