// 5.11 Sleeping efficiency baseline
// Measures average sleeping ratio over N frames for a moderate scenario to compare against future tuning.
import { World } from '../src/physics/world.js';
import { createBrick, _resetBrickIdsForTest } from '../src/interaction/mouse.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const FRAMES = 180; // 3 seconds at 60fps
const CONFIG = { timeStep:1/60, rectWidth:120, rectHeight:80, circleDiameter:1200 };
const BASELINE_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'sleeping-baseline.json');

function populate(w){
  // Mildly interacting cluster: some contacts settle, enabling sleeping.
  const cols = 8, rows = 6; const spacingX=130, spacingY=90;
  let id=0;
  for (let r=0;r<rows;r++){
    for (let c=0;c<cols;c++){
      const x=(c - cols/2)*spacingX + (r%2 ? spacingX/2 : 0);
      const y=(r - rows/2)*spacingY;
      w.add(createBrick(x,y,CONFIG.rectWidth,CONFIG.rectHeight));
      id++; if (id>=48) break;
    }
  }
}

function measure(){
  _resetBrickIdsForTest();
  const w = new World(CONFIG);
  populate(w);
  w.enableSleeping({ framesRequired:25, minLinearVel:0.05, minCorrection:0.02, wakeLinearVel:0.08 });
  let sleepingSum=0;
  for (let f=0; f<FRAMES; f++){
    // Introduce a slight initial disturbance first few frames to avoid immediate sleep
    if (f<5){ for (const e of w.entities){ e.pos.x += (Math.sin(f+e.id)*0.3); } }
    w.step(w.lastTime + 1000/60);
    const asleepCount = w.entities.filter(e=>e.asleep).length;
    sleepingSum += asleepCount / w.entities.length;
  }
  const avgSleepingRatio = sleepingSum / FRAMES; // 0..1
  return { avgSleepingRatio, frames:FRAMES, entityCount:w.entities.length };
}

function loadBaseline(){ if (!fs.existsSync(BASELINE_FILE)) return null; try { return JSON.parse(fs.readFileSync(BASELINE_FILE,'utf8')); } catch { return null; } }
function saveBaseline(data){ fs.writeFileSync(BASELINE_FILE, JSON.stringify(data,null,2)); }

function main(){
  const result = measure();
  const baseline = loadBaseline();
  console.log('[SleepEff] current avgSleepingRatio=' + result.avgSleepingRatio.toFixed(4));
  if (!baseline || process.env.SLEEP_EFF_UPDATE === '1'){
    const toStore = { version: baseline? (baseline.version||0)+1 : 1, created:new Date().toISOString(), result };
    saveBaseline(toStore);
    console.log('[SleepEff] baseline saved');
    return;
  }
  // Compare: allow small variance (absolute diff <= 0.08)
  const diff = Math.abs(result.avgSleepingRatio - baseline.result.avgSleepingRatio);
  console.log('[SleepEff] baseline=' + baseline.result.avgSleepingRatio.toFixed(4) + ' diff=' + diff.toFixed(4));
  if (diff > 0.08){
    console.error('[SleepEff][WARN] deviation exceeds tolerance (0.08)');
  }
}

main();
