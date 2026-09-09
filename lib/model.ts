import {footSpacingErrors} from "@/public/cad/constraints.mjs";
export type Vec3 = [number, number, number];
export type Triangle = [Vec3, Vec3, Vec3];

export type AdapterConfig = {
  clipCount: 1 | 2 | 3 | 4;
  positioningRule: "compact" | "peg-row" | "rectangle" | "wide" | "manual";
  keepClipsInside: boolean;
  manualClips: [number, number][];
  lockedClips: [number, number][] | null;
  baseStyle: "linked" | "full";
  pegCount: 1 | 2;
  feetEnabled: boolean;
  pegSpacing: number;
  pegShaftDiameter: number;
  pegHeadDiameter: number;
  pegHeadThickness: number;
  pegProtrusion: number;
  footSpacingX: number;
  footSpacingY: number;
  footOffsetY: number;
  footDiameter: number;
  footClearance: number;
  cradleWall: number;
  cradleDepth: number;
  plateThickness: number;
};

export const DEFAULT_CONFIG: AdapterConfig = {
  clipCount: 4,
  positioningRule: "compact",
  keepClipsInside: false,
  manualClips: [[-20,0],[20,0],[-60,-40],[60,-40]],
  lockedClips: null,
  baseStyle: "linked",
  pegCount: 2,
  feetEnabled: true,
  pegSpacing: 89,
  pegShaftDiameter: 5.2,
  pegHeadDiameter: 8.5,
  pegHeadThickness: 2,
  pegProtrusion: 5,
  footSpacingX: 148.25,
  footSpacingY: 92.9,
  footOffsetY: 9.8,
  footDiameter: 12.12,
  footClearance: 0.4,
  cradleWall: 2,
  cradleDepth: 3.4,
  plateThickness: 5.4,
};

function normalOf([a, b, c]: Triangle): Vec3 {
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
  const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
  const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
  const length = Math.hypot(nx, ny, nz) || 1;
  return [nx / length, ny / length, nz / length];
}

export function binaryStl(triangles: Triangle[]) {
  const buffer = new ArrayBuffer(84 + triangles.length * 50);
  const view = new DataView(buffer);
  const title = new TextEncoder().encode("SKADIS Adapter Studio generated STL");
  new Uint8Array(buffer, 0, title.length).set(title);
  view.setUint32(80, triangles.length, true);
  triangles.forEach((triangle, index) => {
    let offset = 84 + index * 50;
    const normal = normalOf(triangle);
    for (const value of normal) { view.setFloat32(offset, value, true); offset += 4; }
    for (const vertex of triangle) for (const value of vertex) { view.setFloat32(offset, value, true); offset += 4; }
    view.setUint16(offset, 0, true);
  });
  return new Blob([buffer], { type: "model/stl" });
}

export function validateConfig(cfg: AdapterConfig) {
  const issues: string[] = footSpacingErrors(cfg);
  if(![1,2,3,4].includes(cfg.clipCount))issues.push('Choose one to four SKÅDIS clips.');
  if (cfg.pegHeadDiameter <= cfg.pegShaftDiameter) issues.push("Peg head must be wider than the neck.");
  if (cfg.pegProtrusion <= cfg.pegHeadThickness) issues.push("Peg protrusion must exceed head thickness.");
  const active=(key:string)=>!(cfg.pegCount===1&&key==='pegSpacing')&&(cfg.feetEnabled||!key.startsWith('foot')&&!key.startsWith('cradle'));
  for(const [key,value] of Object.entries(cfg))if(active(key)&&typeof value==='number'&&(!Number.isFinite(value)||Math.abs(value)>600))issues.push('Dimensions must be finite and no larger than 600 mm.');
  for(const key of ['pegSpacing','pegShaftDiameter','pegHeadDiameter','pegHeadThickness','pegProtrusion','footSpacingX','footSpacingY','footDiameter','cradleWall','cradleDepth'] as const)if(active(key)&&cfg[key]<=0)issues.push(`${key} must be greater than zero.`);
  if(cfg.pegCount!==1&&cfg.pegCount!==2)issues.push('Choose one or two pegs.');
  if(cfg.pegHeadThickness<.8)issues.push('Head thickness must be at least 0.8 mm.');
  if(cfg.feetEnabled&&cfg.footClearance<0)issues.push('Foot clearance cannot be negative.');
  if((cfg.feetEnabled&&cfg.footDiameter>60)||cfg.pegHeadDiameter>40||cfg.pegProtrusion>50)issues.push('Interface dimensions exceed the supported range.');
  if(cfg.feetEnabled&&Math.abs(cfg.footSpacingX-(cfg.pegCount===1?0:cfg.pegSpacing))/2<cfg.footDiameter/2+cfg.cradleWall+cfg.pegHeadDiameter/2+2&&Math.abs(cfg.footOffsetY)<cfg.footDiameter/2+cfg.pegHeadDiameter/2+2)issues.push('The upper cradles and pegs overlap. Increase their separation.');
  if (Math.abs(cfg.plateThickness - 5.4) > 0.01) issues.push("The supplied T-Clip seat requires a 5.4 mm plate.");
  return issues;
}

export function configuredScad(source: string, cfg: AdapterConfig, plan: any) {
  const replacements: Record<string, string | number> = {
    base_style: `"${cfg.baseStyle}"`,
    peg_center_spacing: cfg.pegSpacing,
    foot_centres_x: cfg.footSpacingX,
    foot_centres_y: cfg.footSpacingY,
    foot_above_seated_peg: cfg.footOffsetY,
    peg_shaft_diameter: cfg.pegShaftDiameter,
    peg_head_diameter: cfg.pegHeadDiameter,
    peg_head_thickness: cfg.pegHeadThickness,
    peg_protrusion: cfg.pegProtrusion,
    foot_diameter: cfg.footDiameter,
    foot_radial_clearance: cfg.footClearance,
    cradle_wall: cfg.cradleWall,
    cradle_depth: cfg.cradleDepth,
    plate_thickness: cfg.plateThickness,
  };
  let result = source.replace(/^layout_mode\s*=.*?;/m,'layout_mode = "custom";');
  for(const [key,value] of Object.entries({custom_peg_positions:plan.pegs,custom_foot_positions:plan.feet,custom_tclip_positions:plan.clips,custom_frame_links:plan.links}))result=result.replace(new RegExp('^'+key+'\\s*=[\\s\\S]*?;', 'm'),key+' = '+JSON.stringify(value)+';');
  for (const [key, value] of Object.entries(replacements)) {
    result = result.replace(new RegExp(`^${key}\\s*=.*?;`, "m"), `${key} = ${value};`);
  }
  return result;
}
