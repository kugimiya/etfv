import { World } from "./core/World";

const ticks_count = 10;
const world = new World({
  particles_count: 2048,
});

console.time(`${ticks_count} ticks`);
for (let i = 0; i < ticks_count; i++) {
  world.update();
}
console.timeEnd(`${ticks_count} ticks`);
