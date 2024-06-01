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
  const world = new World({
    particles_count: 1024 * 32,
    time_delta: 0.1,
    sub_stepping: 1,
  });

  world.randomize_particles();
  await world.etp_gravity.init();
  await world.etp_upd_pos.init();

  while (true) {
    console.time(`frame ${tick} calc time`);
    await world.update();
    console.timeEnd(`frame ${tick} calc time`);

    // draw lmao
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, 1000, 1000);
    ctx.fill();

    ctx.fillStyle = "red";
    for (let i = 0; i < world.particles.count; i++) {
      ctx.fillRect(world.particles.x[i], world.particles.y[i], 1, 1);
      ctx.fill();
    }

    const png_buff = canvas.toBuffer("image/png", { compressionLevel: 3, filters: canvas.PNG_FILTER_NONE });
    writeFileSync(`output/frame_${String(tick).padStart(6, "0")}.png`, png_buff);
    tick += 1;
  }
}

main().catch(console.error);
