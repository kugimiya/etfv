import { createCanvas } from "canvas";
import { World } from "./core/World";
import { mkdirSync, writeFileSync } from "fs";

const space_multiplier = 40;
const radius_multiplier = 10;
const canvas = createCanvas(1000, 1000);
const ctx = canvas.getContext("2d");

try {
  mkdirSync("output");
} catch {}

async function main() {
  let tick = 0;
  const shouldDraw = true;
  const world = new World({
    world_size: 1000 * space_multiplier,
    particles_count: 1024 * 16,
    time_delta: 0.01,
    sub_stepping: 12,
  });

  world.randomize_particles(space_multiplier, radius_multiplier);
  await world.etp_gravity.init();
  await world.etp_upd_pos.init();
  await world.etp_apply_constraints.init();

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

      for (let i = 0; i < world.particles.count; i++) {
        ctx.fillStyle = `rgba(0,0,0,0)`;
        ctx.beginPath();
        ctx.arc(
          world.particles.x[i] / space_multiplier,
          world.particles.y[i] / space_multiplier,
          world.particles.radius[i] / space_multiplier,
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
