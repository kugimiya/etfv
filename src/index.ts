import { mkdirSync, writeFileSync } from "node:fs";
import { cpus } from "node:os";
import { createCanvas } from "canvas";
import { World } from "./core/World";

try {
  mkdirSync("output");
} catch {}

async function main() {
  const CPU_CORES = cpus().length;

  // init opts
  const world_size_base = 1000;
  const world_size_multiplier = 65;
  const particles_count_base = 1024; // multiplied by cpu cores below
  const chunk_size = 650;
  const sub_stepping = 12;
  const time_delta = 1 / 60; // fps unow :^)

  // randomize particle positions opts
  const mass_multiplier = 2500;
  const radius = 25;
  const x_range = 40000; // center +- range / 2
  const y_range = 40000; // center +- range / 2
  const x_velocity_multiplier = 2;
  const y_velocity_multiplier = 40;

  const canvas = createCanvas(world_size_base, world_size_base);
  const ctx = canvas.getContext("2d");
  const shouldDraw = true;

  console.log(
    [
      `particles_count=${particles_count_base * CPU_CORES}`,
      `world_size=${world_size_multiplier * world_size_base}`,
    ].join("\n"),
  );

  const world = new World({
    world_size: world_size_multiplier * world_size_base,
    particles_count: particles_count_base * CPU_CORES,
    time_delta,
    sub_stepping,
    chunk_size,
  });

  world.randomize_particles(mass_multiplier, radius, x_range, y_range, x_velocity_multiplier, y_velocity_multiplier);
  await world.etp_gravity.init();
  await world.etp_upd_pos.init();
  await world.etp_apply_constraints.init();
  await world.etp_collider.init();

  let tick = 0;
  while (true) {
    console.time(`frame ${tick} calc time`);
    await world.update();
    console.timeEnd(`frame ${tick} calc time`);
    tick += 1;

    // draw lmao
    if (shouldDraw) {
      ctx.fillStyle = `rgba(255,255,255,1)`;
      ctx.fillRect(0, 0, world_size_base, world_size_base);
      ctx.fill();

      ctx.strokeStyle = `rgba(0,0,0,0.1)`;
      ctx.fillStyle = `rgba(0,0,0,0.2)`;

      for (let i = 0; i < world.particles.count; i++) {
        ctx.beginPath();
        ctx.arc(
          world.particles.x[i] / world_size_multiplier,
          world.particles.y[i] / world_size_multiplier,
          world.particles.radius[i] / world_size_multiplier,
          0,
          360,
        );
        ctx.stroke();
        ctx.fill();
      }

      const png_buff = canvas.toBuffer("image/png", { compressionLevel: 3, filters: canvas.PNG_FILTER_NONE });
      writeFileSync(`output/frame_${String(tick).padStart(6, "0")}.png`, png_buff);
    }
  }
}

main().catch(console.error);
