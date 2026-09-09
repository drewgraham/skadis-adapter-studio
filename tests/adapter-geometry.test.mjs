import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import init from 'manifold-3d';
import {makeSolid,layout} from '../public/cad/geometry.mjs';
const api=await init();api.setup();
const bytes=fs.readFileSync(new URL('../public/models/tclip_clip_seat.stl',import.meta.url));
const seat=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.length);
import {footSpacingLimits,footSpacingErrors} from '../public/cad/constraints.mjs';
const defaults={baseStyle:'linked',pegSpacing:89,pegShaftDiameter:5.2,pegHeadDiameter:8.5,pegHeadThickness:2,pegProtrusion:5,footSpacingX:148.25,footSpacingY:92.9,footOffsetY:9.8,footDiameter:12.12,footClearance:.4,cradleWall:2,cradleDepth:3.4,plateThickness:5.4};
test('optional interfaces do not affect placement through hidden dimensions',()=>{
 for(const pegCount of [1,2])for(const positioningRule of ['compact','peg-row','rectangle','wide']){
  const c={...defaults,pegCount,positioningRule,feetEnabled:false};
  const p=layout(c);
  assert.deepEqual(p,layout({...c,footSpacingX:0,footSpacingY:0,footDiameter:50,cradleDepth:20,footOffsetY:400,keepClipsInside:true}));
  assert.equal(p.feet.length,0);
  if(pegCount===1){assert.deepEqual(p.pegs,[[0,0]]);assert.deepEqual(p,layout({...c,pegSpacing:500}));}
  assert.equal(p.clips.length,4);
 }
});
test('upper seats stay inboard through the 149 mm score crossover',()=>{
 for(let width=148;width<=160;width+=.05){
  const p=layout({...defaults,footSpacingX:width});
  assert.deepEqual(p.clips.slice(0,2),[[-20,0],[20,0]]);
 }
});
for(const change of [{},{pegCount:1},{feetEnabled:false},{pegCount:1,feetEnabled:false},{footSpacingX:149},{footSpacingX:400},{footSpacingX:100,pegSpacing:45},{footSpacingX:30},{footSpacingY:220},{footSpacingX:100,footSpacingY:120,footOffsetY:40}])for(const baseStyle of ['linked','full']){
 test(`${baseStyle}: ${JSON.stringify(change)} remains printable and on-grid`,()=>{
  const r=makeSolid(api,{...defaults,...change,baseStyle},seat);
  assert.equal(r.bodies,1);assert.ok(r.volume>0);
  assert.equal(r.plan.pegs.length,change.pegCount===1?1:2);
  assert.equal(r.plan.feet.length,change.feetEnabled===false?0:4);
  const edges=new Map();for(const t of r.triangles)for(let i=0;i<3;i++){
    const k=[t[i].join(','),t[(i+1)%3].join(',')].sort().join('|');edges.set(k,(edges.get(k)||0)+1);
  }
  for(const count of edges.values())assert.equal(count,2);
  for(const p of r.plan.clips){assert.equal(Math.abs((p[0]-r.plan.clips[0][0])%40),0);assert.equal(Math.abs((p[1]-r.plan.clips[0][1])%40),0);}
  if(change.footSpacingX===400)assert.ok(r.plan.clips[1][0]>=100);
 });
}

test('cradle envelopes have a two millimetre gap on each axis',()=>{
 const limits=footSpacingLimits(defaults);
 assert.deepEqual(limits,{x:18.92,y:20.16});
 assert.equal(footSpacingErrors({...defaults,footSpacingX:limits.x,footSpacingY:limits.y}).length,0);
 for(const key of ['footSpacingX','footSpacingY']){
  const c={...defaults,[key]:(key==='footSpacingX'?limits.x:limits.y)-.01};
  assert.ok(footSpacingErrors(c).length);
  assert.throws(()=>layout(c),/at least/);
 }
 assert.ok(footSpacingLimits({...defaults,footDiameter:30}).x>limits.x);
 assert.ok(footSpacingLimits({...defaults,cradleWall:4}).y>limits.y);
});
test('narrow layouts use nearby rows rather than distant upper clips',()=>{
 const p=layout({...defaults,footSpacingX:100,pegSpacing:45});
 assert.equal(p.clips[1][0],20);
 assert.notEqual(p.clips[1][1],0);
 const small=layout({...defaults,footSpacingX:30});
 assert.ok(small.clips[1][0]<=60);
});

test('positioning rule contracts and hard constraints',()=>{
 const base=layout(defaults).clips;
 const pegRow=layout({...defaults,positioningRule:'peg-row',footSpacingX:100,pegSpacing:45}).clips;
 assert.equal(pegRow[0][1],0);assert.equal(pegRow[1][1],0);
 const rect=layout({...defaults,positioningRule:'rectangle'}).clips;
 assert.equal(rect[0][0],rect[2][0]);assert.equal(rect[1][0],rect[3][0]);assert.ok(rect[0][1]>rect[2][1]);
 const wide=layout({...defaults,positioningRule:'wide'}).clips;
 assert.ok(wide[1][0]>base[1][0]);
 assert.throws(()=>layout({...defaults,footSpacingX:30,keepClipsInside:true}),/cannot fit/);
 assert.throws(()=>layout({...defaults,positioningRule:'peg-row',footSpacingX:100,pegSpacing:45,keepClipsInside:true}),/cannot fit/);
 const locked=layout({...defaults,footSpacingX:400,lockedClips:base}).clips;
 assert.deepEqual(locked,base);
 assert.notDeepEqual(layout({...defaults,footSpacingX:400}).clips,base);
 assert.deepEqual(layout({...defaults,positioningRule:'manual',manualClips:base}).clips,base);
 assert.throws(()=>layout({...defaults,positioningRule:'manual',manualClips:[[0,0],...base.slice(1)]}),/grid/);
 assert.throws(()=>layout({...defaults,positioningRule:'manual',manualClips:[base[0],base[0],base[2],base[3]]}),/overlap/);
 assert.throws(()=>layout({...defaults,pegSpacing:40,lockedClips:base}),/too close/);
});
for(const rule of ['peg-row','rectangle','wide','manual'])test(`solid export for ${rule}`,()=>{
 const c={...defaults,positioningRule:rule,manualClips:[[-20,40],[60,40],[-60,-40],[20,-80]]};
 const r=makeSolid(api,c,seat);assert.equal(r.bodies,1);
 const edges=new Map();for(const t of r.triangles)for(let i=0;i<3;i++){const k=[t[i].join(','),t[(i+1)%3].join(',')].sort().join('|');edges.set(k,(edges.get(k)||0)+1);}
 for(const count of edges.values())assert.equal(count,2);
});

for(const clipCount of [1,2,3])for(const pegCount of [1,2])for(const feetEnabled of [true,false])for(const baseStyle of ['linked','full'])test(`clip count ${clipCount}, peg count ${pegCount}, feet ${feetEnabled}, ${baseStyle}`,()=>{
 const c={...defaults,clipCount,pegCount,feetEnabled,baseStyle};
 const r=makeSolid(api,c,seat);
 assert.equal(r.bodies,1);assert.equal(r.plan.clips.length,clipCount);
 const edges=new Map();for(const t of r.triangles)for(let i=0;i<3;i++){const k=[t[i].join(','),t[(i+1)%3].join(',')].sort().join('|');edges.set(k,(edges.get(k)||0)+1);}
 for(const n of edges.values())assert.equal(n,2);
 for(const positioningRule of ['compact','peg-row','rectangle','wide']){
  const p=layout({...c,positioningRule});assert.equal(p.clips.length,clipCount);
  assert.deepEqual(layout({...c,positioningRule:'manual',manualClips:p.clips}).clips,p.clips);
  for(const [x,y]of p.clips){assert.equal(Math.abs((x-p.clips[0][0])%40),0);assert.equal(Math.abs(y%40),0);}
  if(clipCount===3)assert.notEqual((p.clips[1][0]-p.clips[0][0])*(p.clips[2][1]-p.clips[0][1]),0);
 }
});

test('automatic layouts and their reinforcement prefer reflection symmetry',()=>{
 for(const clipCount of [1,2,3,4])for(const pegCount of [1,2])for(const feetEnabled of [true,false])for(const footSpacingX of [30,100,148.25,149,250,400]){
  const p=layout({...defaults,clipCount,pegCount,feetEnabled,footSpacingX});
  const same=(a,b)=>Math.abs(a[0]-b[0])<1e-7&&Math.abs(a[1]-b[1])<1e-7;
  const mirror=a=>[-a[0],a[1]];
  for(const a of p.clips)assert.ok(p.clips.some(b=>same(b,mirror(a))),JSON.stringify({clipCount,pegCount,feetEnabled,footSpacingX,p}));
  if(clipCount===1)assert.equal(p.clips[0][0],0);
  if(clipCount===3)assert.equal(p.clips[2][0],0);
  for(const [a,b]of p.links)assert.ok(p.links.some(([u,v])=>(same(u,mirror(a))&&same(v,mirror(b)))||(same(v,mirror(a))&&same(u,mirror(b)))));
 }
});
