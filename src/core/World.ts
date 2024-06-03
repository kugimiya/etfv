import { cpus } from "node:os";
import { ETP } from "etp-ts";
import { ParticleContainer } from "./ParticleContainer";
import { main as gravity_etps, Params as GravityETPsParams } from "./ETPs/gravity";
import { main as upd_pos_etps, Params as UpdPosETPsParams } from "./ETPs/upd_pos";
import { main as apply_constr_etps, Params as ApplCnstrETPsParams } from "./ETPs/apply_constraints";
import { readFileSync } from "node:fs";
import { VectorMath } from "./VectorMath";

type WorldParams = {
  particles_count: number;
  world_size?: number;
  g_constant?: number;
  sub_stepping?: number;
  time_delta?: number;
  collide_responsibility?: number;
};

const CPU_CORES = cpus().length;
const ETP_DEPS = [readFileSync(`${__dirname}/VectorMath.js`).toString()].join("\n");

export class World {
  etp_gravity: ETP<GravityETPsParams, null>;
  etp_upd_pos: ETP<UpdPosETPsParams, null>;
  etp_apply_constraints: ETP<ApplCnstrETPsParams, null>;
  particles: ParticleContainer;

  world_size: number;
  g_constant: number;
  sub_stepping: number;
  time_delta: number;
  time_delta_subbed: number;
  collide_responsibility: number;

  constructor({
    particles_count,
    world_size,
    g_constant,
    sub_stepping,
    time_delta,
    collide_responsibility,
  }: WorldParams) {
    this.particles = new ParticleContainer(particles_count);
    this.etp_gravity = new ETP(CPU_CORES, gravity_etps, ETP_DEPS);
    this.etp_upd_pos = new ETP(CPU_CORES, upd_pos_etps, ETP_DEPS);
    this.etp_apply_constraints = new ETP(CPU_CORES, apply_constr_etps, ETP_DEPS);

    this.world_size = world_size || 1024;
    this.g_constant = g_constant || 6.67445;
    this.sub_stepping = sub_stepping || 8;
    this.time_delta = time_delta || 0.01;
    this.time_delta_subbed = this.time_delta / this.sub_stepping;
    this.collide_responsibility = collide_responsibility || 0.375;

    if (particles_count % CPU_CORES !== 0) {
      throw new Error(`particles=${particles_count} % cpu_cores=${CPU_CORES} should equal 0!`);
    }
  }

  randomize_particles(space_multiplier: number, radius_multiplier: number) {
    const center = this.world_size / 2;

    for (let i = 0; i < this.particles.count; i++) {
      this.particles.mass[i] = Math.random() * 2500;
      this.particles.radius[i] = 25;

      this.particles.x[i] = (Math.random() - 0.5) * 20000;
      this.particles.y[i] = (Math.random() - 0.5) * 15000;

      this.particles.x[i] = this.particles.x[i] + center;
      this.particles.y[i] = this.particles.y[i] + center;

      this.particles.prev_x[i] = this.particles.x[i] - (Math.random() - 0.5) * 1;
      this.particles.prev_y[i] = this.particles.y[i] - (Math.random() - 0.5) * 60;
    }
  }

  async update() {
    try {
      await this.update_gravity_acc();
      await this.update_particles_pos();

      for (let i = 0; i < this.sub_stepping; i++) {
        this.resolve_collisions();
        await this.resolve_space_constraints();
      }
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

  resolve_collisions() {
    for (let i = 0; i < this.particles.count; i++) {
      for (let j = i; j < this.particles.count; j++) {
        if (i === j) continue;

        // check n resolve collisions
        const velocity = VectorMath.subtract(
          [this.particles.x[i], this.particles.y[i]],
          [this.particles.x[j], this.particles.y[j]],
        );

        const distance_squared = VectorMath.lengthSquared(velocity);
        const distance_minimal = this.particles.radius[i] + this.particles.radius[j];

        if (distance_squared >= distance_minimal * distance_minimal) continue;

        const distance = Math.sqrt(distance_squared);
        const diff = VectorMath.divide(velocity, distance);

        const common_mass = this.particles.mass[i] + this.particles.mass[j];
        const particle1_mass_ratio = this.particles.mass[i] / common_mass;
        const particle2_mass_ratio = this.particles.mass[j] / common_mass;

        const delta = this.collide_responsibility * (distance - distance_minimal);

        // Upd positions
        const particle1_position = VectorMath.subtract(
          [this.particles.x[i], this.particles.y[i]],
          VectorMath.divide(VectorMath.multiply(diff, particle2_mass_ratio * delta), 2),
        );

        this.particles.x[i] = particle1_position[0];
        this.particles.y[i] = particle1_position[1];

        const particle2_position = VectorMath.add(
          [this.particles.x[j], this.particles.y[j]],
          VectorMath.divide(VectorMath.multiply(diff, particle1_mass_ratio * delta), 2),
        );

        this.particles.x[j] = particle2_position[0];
        this.particles.y[j] = particle2_position[1];
      }
    }
  }

  async resolve_space_constraints() {
    const chunk_size = this.particles.count / CPU_CORES;
    const promises: Promise<null>[] = [];

    for (let sub_i = 0; sub_i < CPU_CORES; sub_i++) {
      promises.push(
        this.etp_apply_constraints.do_work([
          sub_i * chunk_size,
          (sub_i + 1) * chunk_size,
          this.world_size,
          this.particles.x,
          this.particles.y,
        ]),
      );
    }

    await Promise.all(promises);
  }
}
