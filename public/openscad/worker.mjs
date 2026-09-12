import init from './openscad.js';
import {renderScad} from './bridge.mjs?v=mesh-clean-1';
import {footSpacingErrors} from '../cad/constraints.mjs';
let assetsPromise;
async function fetchFile(url,binary=false){const r=await fetch(url);if(!r.ok)throw Error('A model file could not load. Reload to retry.');return binary?r.arrayBuffer():r.text();}
function assets(){return assetsPromise??=Promise.all([
  fetchFile('/openscad/openscad.wasm',true),fetchFile('/models/tclip_clip_seat.stl',true),
  fetchFile('/models/skadis_peg_foot_adapter_generator.scad'),fetchFile('/models/automatic-layout.scad')
]).then(([wasm,seat,source,rules])=>({wasm,seat,source,rules}));}
self.onmessage=async({data:{id,config}})=>{
  const begin=performance.now();
  try{
    // Validate object constraints independently; SCAD still chooses and validates placement.
    const errors=footSpacingErrors(config);if(errors.length)throw Error(errors.join(' '));
    const files=await assets(),loaded=performance.now();
    const result=await renderScad(init,files,config);
    result.timings.assetMs=loaded-begin;
    result.timings.totalMs=performance.now()-begin;
    self.postMessage({id,...result});
  }catch(e){self.postMessage({id,error:e.message||'OpenSCAD could not generate the model.'});}
};
