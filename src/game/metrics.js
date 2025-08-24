export class Metrics {
  constructor(state, world){
    this.state = state;
    this.world = world;
  }
  coveragePercent(){
    const totalRectArea = this.state.bricks.reduce((a,b)=>a + b.w*b.h, 0);
    const outer = Math.PI * this.state.circleRadius * this.state.circleRadius;
    const inner = this.state.innerHole ? Math.PI * this.state.innerHoleRadius * this.state.innerHoleRadius : 0;
    const avail = outer - inner;
    if (avail <= 0) return 0;
    return (totalRectArea / avail) * 100;
  }
  perfSnapshot(){
  return { ...this.world.metrics };
  }
}
