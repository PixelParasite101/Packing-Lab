// Penetration alarm: global, lightweight fail‑fast guard used by tests/dev.
// Features (steps 1-3 from recommendations):
//  1) Can be disabled (null threshold) for warm-up phase.
//  2) Can be (re)armed later with setPenetrationAlarm / configurePenetrationAlarm.
//  3) Hysteresis via required consecutive frames over threshold before throwing.
// Usage:
//   setPenetrationAlarm(threshold)                      // simple (1 consecutive frame)
//   configurePenetrationAlarm({ threshold, consecutive:3 }) // advanced hysteresis
//   setPenetrationAlarm(null)                           // disable & reset counters

export let penetrationAlarmThreshold = null;
export let penetrationAlarmConsecutive = 1; // frames required consecutively over threshold
let _consecRun = 0; // internal counter

export function setPenetrationAlarm(threshold){
  // Backwards-compatible simple API (consecutive=1)
  penetrationAlarmThreshold = (typeof threshold === 'number') ? threshold : null;
  _consecRun = 0;
  if (penetrationAlarmThreshold == null) penetrationAlarmConsecutive = 1;
}

export function configurePenetrationAlarm({ threshold=null, consecutive=1 }={}){
  penetrationAlarmThreshold = (typeof threshold === 'number') ? threshold : null;
  penetrationAlarmConsecutive = Math.max(1, consecutive|0);
  _consecRun = 0;
}

export function checkPenetrationAlarm(value){
  if (penetrationAlarmThreshold == null) return; // disabled / warm-up
  if (value > penetrationAlarmThreshold){
    _consecRun++;
    if (_consecRun >= penetrationAlarmConsecutive){
      throw new Error(`[PenetrationAlarm] preMaxPenetration ${value.toFixed(3)} > threshold ${penetrationAlarmThreshold.toFixed(3)} (consec=${_consecRun}/${penetrationAlarmConsecutive})`);
    }
  } else {
    // reset streak if we dip back under
    _consecRun = 0;
  }
}

export function getPenetrationAlarmState(){
  return { threshold: penetrationAlarmThreshold, consecutiveRequired: penetrationAlarmConsecutive, currentRun: _consecRun };
}
