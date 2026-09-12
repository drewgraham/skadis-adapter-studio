// STL serialization hygiene, not a CAD generator. OpenSCAD owns all geometry.
// Canonicalize sub-micron export noise before writing float32 STL coordinates.
// Never patch holes or invent faces: reject anything not closed after cleanup.
export function cleanMesh(triangles) {
  const vertices = [], lookup = new Map(), faces = [];
  let removed = 0;
  for (const triangle of triangles) {
    if (!Array.isArray(triangle) || triangle.length !== 3) throw Error('Invalid mesh triangle.');
    const ids = triangle.map(p => {
      if (!Array.isArray(p) || p.length !== 3 || p.some(v => !Number.isFinite(v))) throw Error('Invalid mesh coordinate.');
      const canonical = p.map(v => Math.fround(Math.round(v * 1e6) / 1e6));
      const key = canonical.join(',');
      if (!lookup.has(key)) { lookup.set(key, vertices.length); vertices.push(canonical); }
      return lookup.get(key);
    });
    const [a,b,c] = ids.map(i => vertices[i]);
    const u = b.map((v,i) => v-a[i]), v = c.map((w,i) => w-a[i]);
    const cross = [u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0]];
    if (new Set(ids).size < 3 || Math.hypot(...cross) <= 1e-12) { removed++; continue; }
    faces.push(ids);
  }
  if (!faces.length) throw Error('Empty mesh after export cleanup.');
  const edges = new Map();
  let volume = 0;
  for (const ids of faces) {
    for (let j=0;j<3;j++) {
      const a=ids[j], b=ids[(j+1)%3], key=a<b?`${a},${b}`:`${b},${a}`;
      const edge=edges.get(key)||{count:0,direction:0};
      edge.count++; edge.direction+=a<b?1:-1; edges.set(key,edge);
    }
    const [a,b,c]=ids.map(i=>vertices[i]);
    volume+=(a[0]*(b[1]*c[2]-b[2]*c[1])+a[1]*(b[2]*c[0]-b[0]*c[2])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;
  }
  if ([...edges.values()].some(e=>e.count!==2||e.direction!==0)) throw Error('The exported mesh is not closed and consistently oriented. Try different dimensions.');
  if (!(volume>0)) throw Error('The exported mesh has invalid volume.');
  return {triangles:faces.map(f=>f.map(i=>vertices[i])), removed, volume};
}
