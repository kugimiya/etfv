import { cpus } from "node:os";
import { readFileSync } from "node:fs";
import { ETP } from "etp-ts";
import { ParticleContainer } from "./ParticleContainer";
import { main as gravity_etps, Params as GravityETPsParams } from "./ETPs/gravity";
import { main as upd_pos_etps, Params as UpdPosETPsParams } from "./ETPs/upd_pos";
import { main as apply_constr_etps, Params as ApplCnstrETPsParams } from "./ETPs/apply_constraints";
import { main as collider_etps, Params as ColliderETPsParams } from "./ETPs/resolve_collisions";

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
const ETP_DEPS = [
  readFileSync(`${__dirname}/VectorMath.js`).toString(),
  readFileSync(`${__dirname}/HashMath.js`).toString(),
].join("\n");

export class World {
  etp_gravity: ETP<GravityETPsParams, null>;
  etp_upd_pos: ETP<UpdPosETPsParams, null>;
  etp_apply_constraints: ETP<ApplCnstrETPsParams, null>;
  etp_collider: ETP<ColliderETPsParams, null>;
  particles: ParticleContainer;

  world_size: number;
  g_constant: number;
  sub_stepping: number;
  time_delta: number;
  time_delta_subbed: number;
  collide_responsibility: number;
  chunk_size: number;
  do_collisions_resolving: boolean;

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
    this.particles = new ParticleContainer(particles_count);
    this.etp_gravity = new ETP(CPU_CORES, gravity_etps, ETP_DEPS);
    this.etp_upd_pos = new ETP(CPU_CORES, upd_pos_etps, ETP_DEPS);
    this.etp_apply_constraints = new ETP(CPU_CORES, apply_constr_etps, ETP_DEPS);
    this.etp_collider = new ETP(CPU_CORES, collider_etps, ETP_DEPS);

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
      this.particles.mass[i] = Math.random() * mass_multiplier;
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
        for (let i = 0; i < this.sub_stepping; i++) {
          await this.resolve_collisions_chunked();
          await this.resolve_space_constraints();
          await this.update_particles_pos();
        }
      }
    } catch (e) {
      console.error(e);
    }
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
          this.chunk_size,
          this.particles.x,
          this.particles.y,
          this.particles.prev_x,
          this.particles.prev_y,
          this.particles.acceleration_x,
          this.particles.acceleration_y,
          this.particles.chunk_index_store,
        ]),
      );
    }

    await Promise.all(promises);
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

  async resolve_collisions_chunked() {
    const promises: Promise<null>[] = [];

    for (let x = 1; x < this.world_size / this.chunk_size; x += 3) {
      const collected_chunks_x: number[] = [];
      const collected_chunks_y: number[] = [];
      for (let y = 1; y < this.world_size / this.chunk_size; y += 3) {
        collected_chunks_x.push(x);
        collected_chunks_y.push(y);
      }

      promises.push(
        this.etp_collider.do_work([
          this.collide_responsibility,
          collected_chunks_x,
          collected_chunks_y,
          this.particles.x,
          this.particles.y,
          this.particles.mass,
          this.particles.radius,
          this.particles.chunk_index_store,
        ]),
      );
    }

    for (let x = 2; x < this.world_size / this.chunk_size; x += 3) {
      const collected_chunks_x: number[] = [];
      const collected_chunks_y: number[] = [];
      for (let y = 2; y < this.world_size / this.chunk_size; y += 3) {
        collected_chunks_x.push(x);
        collected_chunks_y.push(y);
      }

      promises.push(
        this.etp_collider.do_work([
          this.collide_responsibility,
          collected_chunks_x,
          collected_chunks_y,
          this.particles.x,
          this.particles.y,
          this.particles.mass,
          this.particles.radius,
          this.particles.chunk_index_store,
        ]),
      );
    }

    await Promise.all(promises);
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
