// Connectivity check only; closed-solid validity comes from OpenSCAD's native
// geometry summary. No geometry creation or second CAD runtime is used here.
export function checkConnected(triangles){
  if(!Array.isArray(triangles)||!triangles.length)throw Error('Empty mesh.');
  const lookup=new Map(),parent=[];
  const root=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;};
  for(const t of triangles){
    if(t.length!==3)throw Error('Invalid mesh triangle.');
    const ids=t.map(p=>{
      if(p.length!==3||p.some(v=>!Number.isFinite(v)))throw Error('Invalid mesh coordinate.');
      // STL writes float32 positions. Weld at 1e-5 mm to absorb export roundoff.
      const key=p.map(v=>v.toFixed(5)).join(',');
      if(!lookup.has(key)){lookup.set(key,parent.length);parent.push(parent.length);}
      return lookup.get(key);
    });
    for(let i=1;i<3;i++)parent[root(ids[i])]=root(ids[0]);
  }
  const bodies=new Set(parent.map((_,i)=>root(i))).size;
  if(bodies!==1)throw Error('These settings leave disconnected parts.');
  return bodies;
}
