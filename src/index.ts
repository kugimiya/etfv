import { createCanvas } from "canvas";
import { World } from "./core/World";
import { mkdirSync, writeFileSync } from "fs";
import { cpus } from "node:os";
import { HashMath } from "./core/HashMath";

const CPU_CORES = cpus().length;

// init opts
const world_size_mod = 65;
const world_size_base = 1000;
const particles_base = 1024;
const chunk_size = 650;

// randomize opts
const mass_multiplier = 2500;
const radius = 25;
const x_random = 40000;
const y_random = 40000;
const x_vel_mod = 2;
const y_vel_mod = 2;

const canvas = createCanvas(world_size_base, world_size_base);
const ctx = canvas.getContext("2d");

try {
  mkdirSync("output");
} catch {}

console.log(`pcount=${particles_base * CPU_CORES}`);

async function main() {
  let tick = 0;
  const shouldDraw = true;
  const world = new World({
    world_size: world_size_mod * world_size_base,
    particles_count: particles_base * CPU_CORES,
    time_delta: 1 / 144,
    sub_stepping: 12,
    chunk_size: chunk_size,
  });

  world.randomize_particles(mass_multiplier, radius, x_random, y_random, x_vel_mod, y_vel_mod);
  await world.etp_gravity.init();
  await world.etp_upd_pos.init();
  await world.etp_apply_constraints.init();
  await world.etp_collider.init();

  while (true) {
    console.time(`frame ${tick} calc time`);
    await world.update();
    console.timeEnd(`frame ${tick} calc time`);

    // draw lmao
    if (shouldDraw) {
      console.time(`frame ${tick} draw time`);
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, 1000, 1000);
      ctx.fill();

      ctx.fillStyle = `rgba(0,0,0,0.01)`;
      ctx.strokeStyle = `rgba(0,0,0,0)`;

      for (let x = 0; x < (world_size_base * world_size_mod) / chunk_size; x++) {
        for (let y = 0; y < (world_size_base * world_size_mod) / chunk_size; y++) {
          const hash = HashMath.get_hash(x, y);
          if (!world.particles.chunk_index_store.includes(hash)) continue;
          ctx.beginPath();
          ctx.rect(
            (x * chunk_size) / world_size_mod,
            (y * chunk_size) / world_size_mod,
            chunk_size / world_size_mod,
            chunk_size / world_size_mod,
          );
          ctx.fillRect(
            (x * chunk_size) / world_size_mod,
            (y * chunk_size) / world_size_mod,
            chunk_size / world_size_mod,
            chunk_size / world_size_mod,
          );
          ctx.fill();
          ctx.stroke();
        }
      }

      ctx.strokeStyle = `rgba(0,0,0,0.25)`;
      ctx.fillStyle = `rgba(0,0,0,0.15)`;

      for (let i = 0; i < world.particles.count; i++) {
        ctx.beginPath();
        ctx.arc(
          world.particles.x[i] / world_size_mod,
          world.particles.y[i] / world_size_mod,
          world.particles.radius[i] / world_size_mod,
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
    tick += 1;
  }
}

main().catch(console.error);
