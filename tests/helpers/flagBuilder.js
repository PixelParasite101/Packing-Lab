import { World } from '../../src/physics/world.js';
import { GameState } from '../../src/game/state.js';

export function buildPresetWorld(config = { circleDiameter:800, rectWidth:120, rectHeight:80, timeStep:1/60 }){
  const world = new World(config);
  const state = new GameState(world, config);
  if (state.applyArenaFlags) state.applyArenaFlags();
  world.enableSpatialHash && world.enableSpatialHash({ cellSize:128 });
  state.setNudgeEnabled && state.setNudgeEnabled(true);
  state.setAutoPackEnabled && state.setAutoPackEnabled(true);
  world.enableAdvancedFriction && world.enableAdvancedFriction();
  return { world, state };
}
