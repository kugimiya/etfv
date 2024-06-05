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
  const particles_count_base = 1024 * 128;
  const chunk_size = 650;
  const sub_stepping = 12;
  const time_delta = 1 / 60; // fps unow :^)

  // randomize particle positions opts
  const mass_multiplier = 250;
  const radius = 25;
  const x_range = 65000; // center +- range / 2
  const y_range = 65000; // center +- range / 2
  const x_velocity_multiplier = 0;
  const y_velocity_multiplier = 0;

  const canvas = createCanvas(world_size_base, world_size_base);
  const ctx = canvas.getContext("2d");
  const shouldDraw = true;
  const do_collisions_resolving = true;

  console.log(
    [
      `cpu_cores=${CPU_CORES}`,
      `particles_count=${particles_count_base}`,
      `world_size=${world_size_multiplier * world_size_base}`,
    ].join("\n"),
  );

  const world = new World({
    world_size: world_size_multiplier * world_size_base,
    particles_count: particles_count_base,
    time_delta,
    sub_stepping,
    chunk_size,
    do_collisions_resolving,
  });

  world.randomize_particles(mass_multiplier, radius, x_range, y_range, x_velocity_multiplier, y_velocity_multiplier);
  await world.etp_gravity.init();
  await world.etp_upd_pos.init();
  await world.etp_apply_constraints.init();
  await world.etp_collider_bounded.init();
  await world.etp_bound_calc.init();

  let tick = 0;

  // 5 minutes for 60fps video
  while (tick < 3600 * 5) {
    // draw lmao
    if (shouldDraw) {
      console.time(`frame ${tick} draw time`);
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
      console.timeEnd(`frame ${tick} draw time`);
    }

    console.time(`frame ${tick} calc time`);
    await world.update();
    console.timeEnd(`frame ${tick} calc time`);
    tick += 1;
  }

  world.etp_gravity.terminate();
  world.etp_upd_pos.terminate();
  world.etp_apply_constraints.terminate();
  world.etp_collider_bounded.terminate();
  world.etp_bound_calc.terminate();
}

main().catch(console.error);
