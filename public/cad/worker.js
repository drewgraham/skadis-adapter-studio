import init from './manifold.js';
import {makeSolid} from './geometry.mjs?v=9';
const ready=Promise.all([init({locateFile:()=>'/cad/manifold.wasm'}).then(api=>{api.setup();return api;}),fetch('/models/tclip_clip_seat.stl').then(r=>{if(!r.ok)throw Error('Unable to load T-Clip seats.');return r.arrayBuffer();})]);
self.onmessage=async({data})=>{
  try{const [api,seat]=await ready;const result=makeSolid(api,data.config,seat);self.postMessage({id:data.id,...result});}
  catch(e){self.postMessage({id:data.id,error:e.message||'Unable to generate model.'});}
};
