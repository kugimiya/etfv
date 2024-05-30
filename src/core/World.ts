import { ParticleContainer } from "./ParticleContainer";

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

  update_gravity_acc() {}

  resolve_collisions() {}

  resolve_space_constraints() {}
}
