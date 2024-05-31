import { World } from "./core/World";

async function main() {
  const ticks_count = 100;
  const world = new World({
    particles_count: 1024 * 2048,
  });

  world.randomize_positions();

  await world.etp_gravity.init();

  console.time(`${ticks_count} ticks for ${world.particles.count} particles`);

  for (let i = 0; i < ticks_count; i++) {
    await world.update();
  }

  console.timeEnd(`${ticks_count} ticks for ${world.particles.count} particles`);

  world.etp_gravity.terminate();
}

main().catch(console.error);
