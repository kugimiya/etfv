import { cpus } from "node:os";
import { ETP } from "etp-ts";
import { ParticleContainer } from "./ParticleContainer";
import { main as gravity_etps, Params as GravityETPsParams } from "./ETPs/gravity";
import { main as upd_pos_etps, Params as UpdPosETPsParams } from "./ETPs/upd_pos";
import { readFileSync } from "node:fs";

type WorldParams = {
  particles_count: number;
  world_size?: number;
  g_constant?: number;
  sub_stepping?: number;
  time_delta?: number;
};

const CPU_CORES = cpus().length;
const ETP_DEPS = [readFileSync(`${__dirname}/VectorMath.js`).toString()].join("\n");

export class World {
  etp_gravity: ETP<GravityETPsParams, null>;
  etp_upd_pos: ETP<UpdPosETPsParams, null>;
  particles: ParticleContainer;

  world_size: number;
  g_constant: number;
  sub_stepping: number;
  time_delta: number;
  time_delta_subbed: number;

  constructor({ particles_count, world_size, g_constant, sub_stepping, time_delta }: WorldParams) {
    this.particles = new ParticleContainer(particles_count);
    this.etp_gravity = new ETP(CPU_CORES, gravity_etps, ETP_DEPS);
    this.etp_upd_pos = new ETP(CPU_CORES, upd_pos_etps, ETP_DEPS);

    this.world_size = world_size || 1024;
    this.g_constant = g_constant || 6.67445;
    this.sub_stepping = sub_stepping || 8;
    this.time_delta = time_delta || 0.01;
    this.time_delta_subbed = this.time_delta / this.sub_stepping;

    if (particles_count % CPU_CORES !== 0) {
      throw new Error(`particles=${particles_count} % cpu_cores=${CPU_CORES} should equal 0!`);
    }
  }

  randomize_particles() {
    const center = this.world_size / 2;

    for (let i = 0; i < this.particles.count; i++) {
      const angle = Math.random() * Math.PI * 2;
      this.particles.mass[i] = Math.random() * 10;
      this.particles.radius[i] = 1;

      this.particles.x[i] = Math.cos(angle) * Math.random() * 500;
      this.particles.y[i] = Math.sin(angle) * Math.random() * 500;

      this.particles.x[i] = this.particles.x[i] + center;
      this.particles.y[i] = this.particles.y[i] + center;

      this.particles.prev_x[i] = this.particles.x[i] - Math.random() / 1000;
      this.particles.prev_y[i] = this.particles.y[i] - Math.random() / 1000;
    }
  }

  async update() {
    try {
      for (let i = 0; i < this.sub_stepping; i++) {
        this.resolve_collisions();
        this.resolve_space_constraints();
        await this.update_particles_pos();
      }

      await this.update_gravity_acc();
      await this.update_particles_pos();
    } catch (e) {
      console.error(e);
    }
  }

  async update_particles_pos() {
    const chunk_size = this.particles.count / CPU_CORES;
    const promises: Promise<null>[] = [];

    for (let sub_i = 0; sub_i < CPU_CORES; sub_i++) {
      promises.push(
        this.etp_upd_pos.do_work([
          sub_i * chunk_size,
          (sub_i + 1) * chunk_size,
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

  resolve_collisions() {}

  resolve_space_constraints() {}
}
