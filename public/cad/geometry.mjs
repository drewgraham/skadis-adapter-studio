// Shared by the modelling worker and geometry validation. Dimensions in mm.
import {selectClips} from './positioning.mjs?v=9';
import {footSpacingErrors} from './constraints.mjs?v=7';
export function layout(c) {
  const errors=footSpacingErrors(c);
  if(errors.length)throw Error(errors.join(' '));
  const feet=c.feetEnabled===false?[]:[[-c.footSpacingX/2,c.footOffsetY],[c.footSpacingX/2,c.footOffsetY],[-c.footSpacingX/2,c.footOffsetY-c.footSpacingY],[c.footSpacingX/2,c.footOffsetY-c.footSpacingY]];
  const pegs=c.pegCount===1?[[0,0]]:[[-c.pegSpacing/2,0],[c.pegSpacing/2,0]];
  const ro=c.footDiameter/2+c.footClearance+c.cradleWall;
  const pr=Math.max(7,c.pegHeadDiameter/2+2);
  const clips=selectClips(c,feet,pegs,ro,pr);
  if(clips.length<4){
    const nodes=[...clips.map(p=>[p,18]),...pegs.map(p=>[p,pr]),...feet.map(p=>[p,ro+2])];
    const links=[],connected=[nodes[0]],pending=nodes.slice(1);
    // Join every real interface to the nearest connected pad, without phantom mounts.
    while(pending.length){
      let best=null,distance=Infinity,index=0;
      for(const a of connected)pending.forEach((b,i)=>{const d=Math.hypot(a[0][0]-b[0][0],a[0][1]-b[0][1]);if(d<distance){distance=d;best=a;index=i;}});
      const b=pending.splice(index,1)[0];links.push([best[0],b[0],best[1],b[1]]);connected.push(b);
    }
    if(clips.length===3)for(let i=0;i<2;i++)links.push([clips[i],clips[2],18,18]);
    if(feet.length)for(let i=0;i<2;i++)links.push([feet[i],feet[i+2],ro+2,ro+2]);
    // Mirror reinforcement where both reflected interfaces exist. Nearest-pad
    // ties must not turn a symmetric mount arrangement into a one-sided frame.
    const mirrored=p=>nodes.some(([n])=>Math.abs(n[0]+p[0])<1e-7&&Math.abs(n[1]-p[1])<1e-7);
    for(const [a,b,ra,rb]of [...links])if(mirrored(a)&&mirrored(b)){
      const ma=[-a[0],a[1]],mb=[-b[0],b[1]];
      if(!links.some(([u,v])=>(u[0]===ma[0]&&u[1]===ma[1]&&v[0]===mb[0]&&v[1]===mb[1])||(v[0]===ma[0]&&v[1]===ma[1]&&u[0]===mb[0]&&u[1]===mb[1])))links.push([ma,mb,ra,rb]);
    }
    return {feet,pegs,clips,links};
  }
  const topNodes=[...feet.slice(0,2).map(p=>[p,ro+2]),...pegs.map(p=>[p,pr]),...clips.slice(0,2).map(p=>[p,18])].sort((a,b)=>a[0][0]-b[0][0]);
  const links=[];for(let i=1;i<topNodes.length;i++)links.push([topNodes[i-1][0],topNodes[i][0],topNodes[i-1][1],topNodes[i][1]]);
  for(let i=0;i<2;i++){
    if(feet.length){links.push([feet[i],clips[i+2],ro+2,18]);links.push([clips[i+2],feet[i+2],18,ro+2]);}
    else links.push([clips[i],clips[i+2],18,18]);
  }
  return {feet,pegs,clips,links};
}

export function makeSolid(api,c,seatBytes){
  const {Manifold:M,CrossSection:C,Mesh}=api, owned=[];
  const keep=o=>(owned.push(o),o), disk=(p,r)=>keep(keep(C.circle(r,64)).translate(p));
  const rect=(x,y,w,h)=>keep(keep(C.square([w,h])).translate([x,y]));
  const union2=a=>keep(C.union(a));
  const cyl=(x,y,z,h,r1,r2=r1)=>keep(keep(M.cylinder(h,r1,r2,64)).translate([x,y,z]));
  try {
    const plan=layout(c),ri=c.footDiameter/2+c.footClearance,ro=ri+c.cradleWall;
    const outer=plan.feet.length?union2([disk([0,-1.2],ro),rect(-ro,-1.2,2*ro,9.7)]):null;
    const support=outer?keep(outer.offset(2,'Round',2,64)):null;
    const pads=plan.feet.map(p=>keep(support.translate(p)));
    pads.push(...plan.pegs.map(p=>disk(p,Math.max(7,c.pegHeadDiameter/2+2))),...plan.clips.map(p=>disk(p,18)));
    let outline;
    if(c.baseStyle==='full')outline=keep(C.hull(pads));
    else outline=union2([...pads,...plan.links.map(([a,b,ra,rb])=>keep(C.hull([disk(a,ra),disk(b,rb)])))]);
    const holes=union2(plan.clips.map(p=>disk(p,13.992)));
    const parts=[keep(keep(outline.subtract(holes)).extrude(5.4))];
    const v=new DataView(seatBytes),n=v.getUint32(80,true),verts=[],indices=[],index=new Map();
    for(let i=0;i<n;i++)for(let j=0;j<3;j++){
      const o=84+50*i+12+j*12,x=v.getFloat32(o,true),y=v.getFloat32(o+4,true),z=v.getFloat32(o+8,true);
      const key=[x,y,z].map(a=>a.toFixed(5)).join(',');let id=index.get(key);
      if(id===undefined){id=verts.length/3;index.set(key,id);verts.push(x,z,-y);}indices.push(id);
    }
    const mesh=new Mesh({numProp:3,vertProperties:new Float32Array(verts),triVerts:new Uint32Array(indices)});mesh.merge();
    const seat=keep(new M(mesh));if(seat.status()!=='NoError')throw Error('T-Clip seat geometry failed validation.');
    parts.push(...plan.clips.map(([x,y])=>keep(seat.translate([x,y,0]))));
    if(plan.feet.length){
    const pocket=union2([disk([0,-1.2],ri),rect(-ri,-1.2,2*ri,50)]);
    const wall=keep(outer.subtract(pocket));
    let cradle=keep(wall.extrude(c.cradleDepth+.2));
    // Bevel the inside mouth over its last 0.5 mm.
    const bevel=Math.min(.5,c.cradleDepth/2);
    const mouth=keep(M.hull([keep(pocket.extrude(.01)),keep(keep(keep(pocket.offset(bevel,'Round',2,64)).extrude(.01)).translate([0,0,bevel]))]));
    cradle=keep(cradle.subtract(keep(mouth.translate([0,0,c.cradleDepth+.2-bevel]))));
    parts.push(...plan.feet.map(([x,y])=>keep(cradle.translate([x,y,5.2]))));
    }
    const shaft=c.pegProtrusion-c.pegHeadThickness,under=Math.min(1.2,c.pegHeadThickness-.5),top=.25;
    for(const [x,y]of plan.pegs){
      parts.push(cyl(x,y,5.2,shaft+.4,c.pegShaftDiameter/2),cyl(x,y,5.2,Math.min(.8,shaft)+.2,c.pegShaftDiameter/2+.8,c.pegShaftDiameter/2));
      parts.push(cyl(x,y,5.4+shaft,under,Math.min(c.pegHeadDiameter/2-.2,c.pegShaftDiameter/2+.5),c.pegHeadDiameter/2));
      parts.push(cyl(x,y,5.4+shaft+under,c.pegHeadThickness-under-top,c.pegHeadDiameter/2));
      parts.push(cyl(x,y,5.4+c.pegProtrusion-top,top,c.pegHeadDiameter/2,c.pegHeadDiameter/2-top));
    }
    const solid=keep(M.union(parts));
    if(solid.status()!=='NoError')throw Error('Solid generation failed.');
    const bodies=solid.decompose();owned.push(...bodies);
    if(bodies.length!==1)throw Error('The chosen dimensions leave disconnected parts.');
    const result=solid.getMesh(), triangles=[];
    for(let i=0;i<result.triVerts.length;i+=3){const t=[];for(let j=0;j<3;j++){const o=result.triVerts[i+j]*result.numProp;t.push(Array.from(result.vertProperties.slice(o,o+3)));}if(new Set(t.map(p=>p.join(","))).size===3)triangles.push(t);}
    return {triangles,plan,bounds:solid.boundingBox(),volume:solid.volume(),bodies:bodies.length};
  } finally {for(const o of owned.reverse())o.delete();}
}
