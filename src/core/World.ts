import { cpus } from "node:os";
import { ETP } from "etp-ts";
import { ParticleContainer } from "./ParticleContainer";
import { main as gravity_etps, Params as GravityETPsParams } from "./ETPs/gravity";
import { readFileSync } from "node:fs";

type WorldParams = {
  particles_count: number;
  world_size?: number;
  g_constant?: number;
  sub_stepping?: number;
  time_delta?: number;
};

const CPU_CORES = cpus().length;

export class World {
  etp_gravity: ETP<GravityETPsParams, null>;
  particles: ParticleContainer;

  world_size: number;
  g_constant: number;
  sub_stepping: number;
  time_delta: number;
  time_delta_subbed: number;

  constructor({ particles_count, world_size, g_constant, sub_stepping, time_delta }: WorldParams) {
    this.particles = new ParticleContainer(particles_count);
    this.etp_gravity = new ETP(CPU_CORES, gravity_etps, readFileSync(`${__dirname}/VectorMath.js`).toString());

    this.world_size = world_size || 1024;
    this.g_constant = g_constant || 6.67445;
    this.sub_stepping = sub_stepping || 8;
    this.time_delta = time_delta || 0.01;
    this.time_delta_subbed = this.time_delta / this.sub_stepping;
  }

  randomize_positions() {
    for (let i = 0; i < this.particles.count; i++) {
      this.particles.mass[i] = Math.random() * 10;

      this.particles.x[i] = Math.random() * 1000;
      this.particles.y[i] = Math.random() * 1000;

      this.particles.prev_x[i] = this.particles.x[i] - Math.random() * 2;
      this.particles.prev_y[i] = this.particles.y[i] - Math.random() * 2;
    }
  }

  async update() {
    try {
      await this.update_gravity_acc();

      for (let i = 0; i < this.sub_stepping; i++) {
        this.resolve_collisions();
        this.resolve_space_constraints();
        this.update_particles_pos();
      }
    } catch (e) {
      console.error(e);
    }
  }

  update_particles_pos() {}

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
