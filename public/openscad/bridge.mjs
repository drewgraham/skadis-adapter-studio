import {checkConnected} from './mesh-check.mjs';
// The frontend passes measurements, not computed placement or frame links.
const parameters = {
  clip_count:'clipCount', positioning_rule:'positioningRule',keep_clips_inside:'keepClipsInside',
  peg_count:'pegCount',feet_enabled:'feetEnabled',base_style:'baseStyle',peg_center_spacing:'pegSpacing',
  foot_centres_x:'footSpacingX',foot_centres_y:'footSpacingY',foot_above_seated_peg:'footOffsetY',
  peg_shaft_diameter:'pegShaftDiameter',peg_head_diameter:'pegHeadDiameter',peg_head_thickness:'pegHeadThickness',
  peg_protrusion:'pegProtrusion',foot_diameter:'footDiameter',foot_radial_clearance:'footClearance',
  cradle_wall:'cradleWall',cradle_depth:'cradleDepth',plate_thickness:'plateThickness',
};
export function configuredSource(source,rules,config){
  let result=source.replace('include <automatic-layout.scad>',rules);
  const values=Object.fromEntries(Object.entries(parameters).map(([scad,js])=>[scad,config[js]]));
  values.lock_clips=Boolean(config.lockedClips);
  values.manual_clip_positions=config.lockedClips||config.manualClips;
  for(const [key,value]of Object.entries(values)){
    if(value===undefined)throw Error(`Missing parameter: ${key}`);
    result=result.replace(new RegExp(`^${key} = .*?;`,'m'),`${key} = ${JSON.stringify(value)};`);
  }
  return result;
}
export function readStl(bytes){
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  if(bytes.length<84)throw Error('OpenSCAD produced an empty mesh.');
  const count=view.getUint32(80,true);
  if(count===0||bytes.length!==84+count*50)throw Error('Invalid binary STL output.');
  const triangles=[],min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];let signedVolume=0;
  for(let i=0;i<count;i++){
    const t=[];
    for(let j=0;j<3;j++){
      const p=[];for(let k=0;k<3;k++){const v=view.getFloat32(84+i*50+12+j*12+k*4,true);if(!Number.isFinite(v))throw Error('Invalid mesh coordinate.');p.push(v);min[k]=Math.min(min[k],v);max[k]=Math.max(max[k],v);}t.push(p);
    }
    const [a,b,c]=t;signedVolume+=(a[0]*(b[1]*c[2]-b[2]*c[1])+a[1]*(b[2]*c[0]-b[0]*c[2])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;
    triangles.push(t);
  }
  return {triangles,bounds:{min,max},volume:Math.abs(signedVolume)};
}
export async function renderScad(init,assets,config,{planOnly=false}={}){
  const source=configuredSource(assets.source,assets.rules,config),logs=[];
  const start=performance.now();
  const module=await init({noInitialRun:true,wasmBinary:assets.wasm,print:s=>logs.push(s),printErr:s=>logs.push(s)});
  const initialized=performance.now();
  module.FS.writeFile('/adapter.scad',source);
  module.FS.writeFile('/tclip_clip_seat.stl',new Uint8Array(assets.seat));
  const filename=planOnly?'/adapter.csg':'/adapter.stl';
  const args=['/adapter.scad','-o',filename,'--backend','Manifold'];
  if(!planOnly)args.push('--export-format','binstl','--summary','geometry','--summary-file','/summary.json');
  const code=module.callMain(args),rendered=performance.now();
  const failures=logs.filter(l=>/^(ERROR|WARNING):/.test(l));
  if(code!==0||failures.length)throw Error(failures[0]||'OpenSCAD could not produce a solid.');
  const line=logs.find(l=>l.startsWith('ECHO: LAB_PLAN = '));
  if(!line)throw Error('The automatic layout was not returned.');
  const [feet,pegs,clips,links]=JSON.parse(line.slice('ECHO: LAB_PLAN = '.length));
  const result=planOnly?{}:readStl(module.FS.readFile(filename));
  if(!planOnly){
    const summary=JSON.parse(module.FS.readFile('/summary.json',{encoding:'utf8'}));
    if(summary.geometry?.simple!==true)throw Error('OpenSCAD did not produce a valid closed solid.');
    result.bodies=checkConnected(result.triangles);
  }
  return {...result,plan:{feet,pegs,clips,links},source,timings:{startupMs:initialized-start,renderMs:rendered-initialized,decodeMs:performance.now()-rendered},logs};
}
