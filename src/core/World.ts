import { ParticleContainer } from "./ParticleContainer";
import { VectorMath } from "./VectorMath";

type WorldParams = {
  particles_count: number;
  world_size?: number;
  g_constant?: number;
  sub_stepping?: number;
  time_delta?: number;
};

export class World {
  particles: ParticleContainer;

  world_size: number;
  g_constant: number;
  sub_stepping: number;
  time_delta: number;
  time_delta_subbed: number;

  constructor({ particles_count, world_size, g_constant, sub_stepping, time_delta }: WorldParams) {
    this.particles = new ParticleContainer(particles_count);

    this.world_size = world_size || 1024;
    this.g_constant = g_constant || 6.67445;
    this.sub_stepping = sub_stepping || 8;
    this.time_delta = time_delta || 0.01;
    this.time_delta_subbed = this.time_delta / this.sub_stepping;
  }

  update() {
    try {
      this.update_gravity_acc();

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
   * NOTE: It's bruteforce method
   */
  update_gravity_acc() {
    for (let i = 0; i < this.particles.count; i++) {
      for (let j = i; j < this.particles.count; j++) {
        if (i === j) continue;

        const velocity_squared = VectorMath.lengthSquared(
          VectorMath.subtract([this.particles.x[i], this.particles.y[i]], [this.particles.x[j], this.particles.y[j]]),
        );
        const force = this.g_constant * ((this.particles.mass[i] * this.particles.mass[j]) / velocity_squared);
        const acceleration = force / Math.sqrt(velocity_squared);

        const particle1_acceleration = VectorMath.add(
          [this.particles.acceleration_x[i], this.particles.acceleration_y[i]],
          VectorMath.multiply(
            VectorMath.subtract([this.particles.x[j], this.particles.y[j]], [this.particles.x[i], this.particles.y[i]]),
            acceleration,
          ),
        );

        this.particles.acceleration_x[i] = particle1_acceleration[0];
        this.particles.acceleration_y[i] = particle1_acceleration[1];

        const particle2_acceleration = VectorMath.add(
          [this.particles.acceleration_x[j], this.particles.acceleration_y[j]],
          VectorMath.multiply(
            VectorMath.subtract([this.particles.x[i], this.particles.y[i]], [this.particles.x[j], this.particles.y[j]]),
            acceleration,
          ),
        );

        this.particles.acceleration_x[j] = particle2_acceleration[0];
        this.particles.acceleration_y[j] = particle2_acceleration[1];
      }
    }
  }

  resolve_collisions() {}

  resolve_space_constraints() {}
}
