import { createCanvas } from "canvas";
import { World } from "./core/World";
import { mkdirSync, writeFileSync } from "fs";

const canvas = createCanvas(1000, 1000);
const ctx = canvas.getContext("2d");

try {
  mkdirSync("output");
} catch {}

async function main() {
  let tick = 0;
  const shouldDraw = false;
  const world = new World({
    particles_count: 1024 * (1024 * 16),
    time_delta: 0.1,
    sub_stepping: 1,
  });

  world.randomize_particles();
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
        ctx.fillStyle = `rgba(0,0,0,${Math.min(Math.max(world.particles.radius[i] * 100, 0), 1)})`;
        ctx.fillRect(
          world.particles.x[i] - (world.particles.radius[i] * 100) / 2,
          world.particles.y[i] - (world.particles.radius[i] * 100) / 2,
          world.particles.radius[i] * 100,
          world.particles.radius[i] * 100,
        );
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
