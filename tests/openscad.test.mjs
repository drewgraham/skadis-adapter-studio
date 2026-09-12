import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import init from '../public/openscad/openscad.js';
import {renderScad} from '../public/openscad/bridge.mjs';
import {checkConnected} from '../public/openscad/mesh-check.mjs';
const read=p=>fs.readFileSync(new URL(p,import.meta.url));
const assets={wasm:read('../public/openscad/openscad.wasm'),seat:read('../public/models/tclip_clip_seat.stl'),source:read('../public/models/skadis_peg_foot_adapter_generator.scad').toString(),rules:read('../public/models/automatic-layout.scad').toString()};
const {defaults,fixtures}=JSON.parse(read('./layout-fixtures.json'));
const near=(a,b)=>typeof a==='number'?Math.abs(a-b)<1e-4:Array.isArray(a)&&a.length===b.length&&a.every((v,i)=>near(v,b[i]));
test('64 OpenSCAD layouts retain the approved placement and frame links',async()=>{
 for(const {variation,plan} of fixtures){const result=await renderScad(init,assets,{...defaults,...variation},{planOnly:true});for(const k of ['feet','pegs','clips','links'])assert.ok(near(plan[k],result.plan[k]),JSON.stringify(variation)+': '+k);}
});
test('OpenSCAD-only meshes are closed and connected across representative configurations',async()=>{
 for(const variation of [{},{clipCount:1},{clipCount:3},{feetEnabled:false,pegCount:1},{baseStyle:'full'},{pegHeadThickness:1,cradleDepth:.4},{footSpacingX:180,footSpacingY:120,positioningRule:'wide'}]){
  const r=await renderScad(init,assets,{...defaults,...variation});
  assert.equal(r.bodies,1);assert.ok(r.volume>0);assert.ok(r.triangles.length>100);
  assert.ok(Math.abs(r.bounds.min[2])<1e-4);assert.ok(Math.abs(r.bounds.max[2]-10.4)<1e-4);
  console.log(JSON.stringify({variation,renderMs:r.timings.renderMs,volume:r.volume}));
 }
});
test('Manual, locked and invalid placements are handled by OpenSCAD',async()=>{
 for(const variation of [{positioningRule:'manual'}, {lockedClips:defaults.manualClips,footSpacingX:155}]){
  const r=await renderScad(init,assets,{...defaults,...variation},{planOnly:true});assert.ok(near(r.plan.clips,defaults.manualClips));
 }
 for(const variation of [{positioningRule:'manual',manualClips:[[0,0]]},{positioningRule:'manual',manualClips:[[1,0],[41,0],[-60,-40],[60,-40]]},{clipCount:2,lockedClips:[[20,0],[20,0]]}])await assert.rejects(renderScad(init,assets,{...defaults,...variation},{planOnly:true}));
});
test('Connectivity checks reject empty, malformed and disconnected meshes',()=>{
 assert.throws(()=>checkConnected([]),/Empty/);
 assert.throws(()=>checkConnected([[[0,0,NaN],[1,0,0],[0,1,0]]]),/coordinate/);
 assert.throws(()=>checkConnected([[[0,0,0],[1,0,0],[0,1,0]],[[5,0,0],[6,0,0],[5,1,0]]]),/disconnected/);
});
test('Retired CAD engine is absent from source dependencies and public assets',()=>{
 const manifest=JSON.parse(read('../package.json'));assert.equal(manifest.dependencies['manifold-3d'],undefined);
 for(const f of ['geometry.mjs','positioning.mjs','worker.js','manifold.js','manifold.wasm'])assert.equal(fs.existsSync(new URL('../public/cad/'+f,import.meta.url)),false);
});
