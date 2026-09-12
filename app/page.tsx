"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, Download, FileCode2, RotateCcw, ShieldCheck, Wrench } from "lucide-react";
import { PositioningControls } from "@/components/positioning-controls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AdapterConfig, DEFAULT_CONFIG, Triangle, binaryStl, validateConfig } from "@/lib/model";

import {footSpacingLimits} from "@/public/cad/constraints.mjs";

type NumericKey = {[K in keyof AdapterConfig]: AdapterConfig[K] extends number ? K : never}[keyof AdapterConfig];
const groups: { title: string; fields: { key: NumericKey; label: string; hint?: string; step?: number }[] }[] = [
  { title: "Object layout", fields: [
    { key: "pegSpacing", label: "Peg centres", hint: "X spacing", step: .1 },
    { key: "footSpacingX", label: "Foot centres X", step: .1 },
    { key: "footSpacingY", label: "Foot centres Y", step: .1 },
    { key: "footOffsetY", label: "Upper feet above pegs", hint: "When fully seated", step: .1 },
  ]},
  { title: "Keyhole pegs", fields: [
    { key: "pegShaftDiameter", label: "Neck diameter", step: .1 },
    { key: "pegHeadDiameter", label: "Head diameter", step: .1 },
    { key: "pegHeadThickness", label: "Head thickness", step: .1 },
    { key: "pegProtrusion", label: "Total protrusion", step: .1 },
  ]},
  { title: "Round foot cradles", fields: [
    { key: "footDiameter", label: "Foot diameter", step: .1 },
    { key: "footClearance", label: "Radial clearance", step: .05 },
    { key: "cradleWall", label: "Wall thickness", step: .1 },
    { key: "cradleDepth", label: "Cradle depth", step: .1 },
  ]},
];

function NumberField({ field, value, onChange, minimum=0 }: { minimum?: number; field: { key: NumericKey; label: string; hint?: string; step?: number }; value: number; onChange: (key: NumericKey, value: number) => void }) {
  return <label className="number-field"><span>{field.label}{field.hint && <small>{field.hint}</small>}{minimum>0&&<small>Minimum {minimum.toFixed(2)} mm</small>}</span><span className="number-input-wrap"><Input type="number" inputMode="decimal" min={minimum} aria-invalid={value<minimum} step={field.step ?? .1} value={value} onChange={(e) => onChange(field.key, Number(e.target.value))} aria-label={`${field.label} in millimetres`} /><em>mm</em></span></label>;
}

function ModelCanvas({ triangles }: { triangles: Triangle[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewRef = useRef({ yaw: -.5, pitch: .92, zoom: 1 });
  const frameRef = useRef<number | null>(null);
  const redrawRef = useRef<() => void>(() => {});
  const drag = useRef<{ x: number; y: number; yaw: number; pitch: number } | null>(null);
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const view = viewRef.current;
    const rect = canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.floor(rect.width * dpr)), height = Math.max(1, Math.floor(rect.height * dpr));
    if(canvas.width !== width) canvas.width = width;
    if(canvas.height !== height) canvas.height = height;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, rect.width, rect.height);if(!triangles.length)return;
    const cosY = Math.cos(view.yaw), sinY = Math.sin(view.yaw), cosP = Math.cos(view.pitch), sinP = Math.sin(view.pitch);
    const transformed = triangles.map((t) => t.map(([x,y,z]) => { const rx=x*cosY-y*sinY, ry=x*sinY+y*cosY; return [rx,ry*cosP-z*sinP,ry*sinP+z*cosP] as [number,number,number]; }) as Triangle);
    const points=transformed.flat();let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;for(const p of points){minX=Math.min(minX,p[0]);maxX=Math.max(maxX,p[0]);minY=Math.min(minY,p[1]);maxY=Math.max(maxY,p[1]);}
    const scale=Math.min((rect.width-52)/(maxX-minX),(rect.height-62)/(maxY-minY))*view.zoom, ox=rect.width/2-((minX+maxX)/2)*scale, oy=rect.height/2+((minY+maxY)/2)*scale;
    const faces=transformed.map(t=>({t,depth:(t[0][2]+t[1][2]+t[2][2])/3})).sort((a,b)=>a.depth-b.depth), light=[-.35,-.5,.79];
    for(const {t} of faces){ const [a,b,c]=t, ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2],nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx,len=Math.hypot(nx,ny,nz)||1,shade=Math.max(0,(nx*light[0]+ny*light[1]+nz*light[2])/len),l=38+shade*25;
      ctx.beginPath(); ctx.moveTo(ox+a[0]*scale,oy-a[1]*scale); ctx.lineTo(ox+b[0]*scale,oy-b[1]*scale); ctx.lineTo(ox+c[0]*scale,oy-c[1]*scale); ctx.closePath(); ctx.fillStyle=`hsl(187 72% ${l}%)`; ctx.fill();  }
  },[triangles]);
  const scheduleDraw = useCallback(() => {
    if(frameRef.current !== null) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      redrawRef.current();
    });
  }, []);
  useEffect(() => {
    redrawRef.current = draw;
    scheduleDraw();
    const resize = new ResizeObserver(scheduleDraw);
    if(canvasRef.current) resize.observe(canvasRef.current);
    return () => {
      resize.disconnect();
      if(frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    };
  }, [draw, scheduleDraw]);
  return <div className="model-stage"><canvas ref={canvasRef}
    aria-label="Interactive three-dimensional preview of the adapter"
    onPointerDown={e=>{
      if(!e.isPrimary || (e.pointerType==='mouse' && e.button!==0)) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      const view=viewRef.current;
      drag.current={x:e.clientX,y:e.clientY,yaw:view.yaw,pitch:view.pitch};
    }}
    onPointerMove={e=>{
      const start=drag.current;
      if(!start || !e.isPrimary || !e.currentTarget.hasPointerCapture(e.pointerId)) return;
      viewRef.current={...viewRef.current,yaw:start.yaw+(e.clientX-start.x)*.009,pitch:start.pitch+(e.clientY-start.y)*.009};
      scheduleDraw();
    }}
    onPointerUp={e=>{if(e.isPrimary) drag.current=null;}}
    onPointerCancel={e=>{if(e.isPrimary) drag.current=null;}}
    onLostPointerCapture={e=>{if(e.isPrimary) drag.current=null;}}
    onWheel={e=>{
      e.preventDefault();
      const view=viewRef.current;
      viewRef.current={...view,zoom:Math.max(.65,Math.min(1.8,view.zoom*(e.deltaY>0?.92:1.08)))};
      scheduleDraw();
    }}/><div className="view-hint">Drag to rotate · scroll to zoom</div>
    <Button className="reset-view" variant="outline" size="icon" aria-label="Reset model view" onClick={()=>{
      drag.current=null;
      viewRef.current={yaw:-.5,pitch:.92,zoom:1};
      scheduleDraw();
    }}><RotateCcw/></Button></div>;

}

function downloadBlob(blob: Blob, filename: string) { const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000); }

export default function Home(){
  const [config,setConfig]=useState<AdapterConfig>(DEFAULT_CONFIG);
  const [result,setResult]=useState<any>(null), [seatStatus,setSeatStatus]=useState<"loading"|"ready"|"error">("loading"),[error,setError]=useState("");
  const worker=useRef<Worker|null>(null), revision=useRef(0);
  const [epoch,setEpoch]=useState(0);
  const pendingTimer=useRef<ReturnType<typeof setTimeout>|null>(null),sentAt=useRef(0);
  const statusRef=useRef<any>(null);
  statusRef.current={status:seatStatus,error:error||validateConfig(config).join(' '),config,timings:result?.timings};
  useEffect(()=>{
    const context=(document as any).modelContext;if(!context?.registerTool)return;
    const lifecycle=new AbortController();
    Promise.resolve(context.registerTool({name:"read_adapter_benchmark",description:"Read the current OpenSCAD adapter configuration, render status, timings.",inputSchema:{type:"object",properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:(input:any)=>{if(!input||typeof input!=="object"||Object.keys(input).length)throw Error("Expected an empty object.");return structuredClone(statusRef.current);}},{signal:lifecycle.signal})).catch(()=>{});
    return()=>lifecycle.abort();
  },[]);
  const issues=useMemo(()=>validateConfig(config),[config]);
  useEffect(()=>{const w=new Worker('/openscad/worker.mjs?v=mesh-clean-1',{type:'module'});worker.current=w;
    w.onmessage=({data})=>{if(data.id!==revision.current)return;if(pendingTimer.current)clearTimeout(pendingTimer.current);if(data.error){setError(data.error);setSeatStatus('error');setResult(null);}else{data.timings.roundTripMs=performance.now()-sentAt.current;setResult(data);setError('');setSeatStatus('ready');}};
    w.onerror=()=>{if(pendingTimer.current)clearTimeout(pendingTimer.current);setError('The model could not be generated. Choose Retry model to try again.');setSeatStatus('error');};
    return()=>{w.terminate();worker.current=null;if(pendingTimer.current)clearTimeout(pendingTimer.current);};},[epoch]);
  useEffect(()=>{revision.current++;const id=revision.current;setSeatStatus('loading');setError('');setResult(null);
    if(pendingTimer.current)clearTimeout(pendingTimer.current);
    if(issues.length){setSeatStatus('error');return;}const timer=setTimeout(()=>{
      sentAt.current=performance.now();worker.current?.postMessage({id,config});
      pendingTimer.current=setTimeout(()=>{worker.current?.terminate();setError('Rendering exceeded 30 seconds. Choose Retry model to try again.');setSeatStatus('error');},30000);
    },400);return()=>clearTimeout(timer);},[config,issues,epoch]);
  const updateNumber=(key:NumericKey,value:number)=>{if(Number.isFinite(value))setConfig(c=>({...c,[key]:value}));};
  const previewTriangles=result?.triangles||[];
  const exportName=`skadis-adapter-${config.pegCount===1?'single-peg':`${config.pegSpacing}mm`}${config.feetEnabled?'':'-no-feet'}`;
  const visibleGroups=groups.map(group=>({...group,fields:group.fields.filter(({key})=>(config.pegCount!==1||key!=='pegSpacing')&&(config.feetEnabled||!key.startsWith('foot')&&!key.startsWith('cradle')))})).filter(group=>group.fields.length);
  const downloadStl=()=>{if(issues.length||seatStatus!=="ready"||!result)return;downloadBlob(binaryStl(result.triangles),`${exportName}.stl`);};
  const downloadScad=()=>{if(result?.source)downloadBlob(new Blob([result.source],{type:"text/plain"}),`${exportName}-automatic.scad`);};
  const approximateWidth=result?result.bounds.max[0]-result.bounds.min[0]:0, approximateHeight=result?result.bounds.max[1]-result.bounds.min[1]:0;
  return <main className="app-shell">
    <header className="topbar"><div className="brand-mark"><Box/></div><div><h1>SKÅDIS Adapter Studio</h1><p>Configure an adapter for your SKÅDIS board.</p></div><div className={`geometry-status ${seatStatus}`}><span/>{seatStatus==="ready"?"Solid model ready":seatStatus==="error"?"Model needs attention":"Updating solid model"}</div></header>
    <div className="workspace">
      <aside className="controls-panel"><div className="panel-heading"><div><p className="eyebrow">Configure</p><h2>Measured interfaces</h2></div><Button variant="ghost" size="sm" onClick={()=>setConfig(DEFAULT_CONFIG)}>Reset</Button></div>
        <label className="select-field"><span>Base construction</span><Select value={config.baseStyle} onValueChange={value=>setConfig(c=>({...c,baseStyle:value as AdapterConfig["baseStyle"]}))}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="linked">Linked load-path frame</SelectItem><SelectItem value="full">Full supporting back</SelectItem></SelectContent></Select></label>
        <section className="control-group positioning-controls"><h3>Object interfaces</h3>
          <label className="select-field"><span>Mounting pegs</span><Select value={String(config.pegCount)} onValueChange={value=>setConfig(c=>({...c,pegCount:Number(value) as 1|2}))}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="1">Single centred peg</SelectItem><SelectItem value="2">Two pegs</SelectItem></SelectContent></Select></label>
          <label className="position-toggle"><span>Foot supports<small>{config.feetEnabled?'Four supporting cradles.':'No cradles or foot pads; automatic placement follows the pegs.'}</small></span><Switch checked={config.feetEnabled} onCheckedChange={feetEnabled=>setConfig(c=>({...c,feetEnabled}))}/></label>
          {config.pegCount===1&&<p className="position-help">The peg is centred at X 0, Y 0. One peg alone does not prevent the object rotating.</p>}
        </section>
        <PositioningControls config={config} onChange={setConfig} positions={result?.plan.clips||config.lockedClips||undefined} ready={seatStatus==="ready"}/>
        {visibleGroups.map(group=><section className="control-group" key={group.title}><h3>{group.title}</h3>{group.fields.map(field=><NumberField key={field.key} field={field} minimum={field.key==="footSpacingX"?footSpacingLimits(config).x:field.key==="footSpacingY"?footSpacingLimits(config).y:0} value={config[field.key]} onChange={updateNumber}/>)}</section>)}
        <section className="fixed-mount"><ShieldCheck/><div><strong>{config.clipCount}-point SKÅDIS mount</strong><span>Grid placement · 5.4 mm flush seats</span></div></section>
      </aside>
      <section className="preview-panel"><div className="preview-toolbar"><div><p className="eyebrow">Live model</p><h2>{config.baseStyle==="linked"?"Linked frame":"Full supporting back"}</h2></div><div className="dimensions"><span><b>{approximateWidth.toFixed(1)}</b> mm wide</span><span><b>{approximateHeight.toFixed(1)}</b> mm high</span><span><b>{(config.plateThickness+Math.max(config.pegProtrusion,config.feetEnabled?config.cradleDepth:0)).toFixed(1)}</b> mm deep</span></div></div><div className="preview-model-wrap"><ModelCanvas triangles={previewTriangles}/>{seatStatus!=="ready"&&<p className="model-message" role="status">{error||issues[0]||"Running OpenSCAD and checking the solid…"}</p>}</div><div className="measurement-strip"><div><span>{config.pegCount===1?'Peg layout':'Peg centres'}</span><strong>{config.pegCount===1?'Single · centred':`${config.pegSpacing.toFixed(2)} mm`}</strong></div><div><span>{config.feetEnabled?'Foot grid':'Foot supports'}</span><strong>{config.feetEnabled?`${config.footSpacingX.toFixed(2)} × ${config.footSpacingY.toFixed(2)} mm`:'Off'}</strong></div><div><span>{config.feetEnabled?'Upper cradle offset':'SKÅDIS mounts'}</span><strong>{config.feetEnabled?`${config.footOffsetY.toFixed(2)} mm`:`${config.clipCount} T-Clips`}</strong></div></div></section>
      <aside className="output-panel"><div><p className="eyebrow">Export</p><h2>Download your adapter</h2><p className="output-copy">OpenSCAD chooses the clip positions and builds the STL in your browser. The downloaded source keeps the automatic rules.</p><p className="safety-note">Experimental models; no load rating. Check fit and strength before use. <a href="#disclaimer">Safety &amp; disclaimer</a></p></div>{error&&<div className="issues"><p role="alert">{error}</p><Button variant="outline" onClick={()=>setEpoch(v=>v+1)}>Retry model</Button></div>}{issues.length>0&&<div className="issues" role="alert">{issues.map(issue=><p key={issue}>{issue}</p>)}</div>}<Button className="download-primary" size="lg" onClick={downloadStl} disabled={issues.length>0||seatStatus!=="ready"}><Download/> Download STL</Button><Button variant="outline" size="lg" onClick={downloadScad} disabled={seatStatus!=="ready"||issues.length>0}><FileCode2/> Download OpenSCAD</Button><div className="source-note"><strong>The source needs its seat file</strong><a href="/tclip_clip_seat.stl" download>Download T-Clip seat geometry</a></div><section className="print-card"><div className="print-title"><Wrench/><h3>PETG starting point</h3></div><dl><div><dt>Layer</dt><dd>0.20 mm</dd></div><div><dt>Walls</dt><dd>5–6</dd></div><div><dt>Infill</dt><dd>40% gyroid</dd></div><div><dt>Supports</dt><dd>None</dd></div></dl><p>Print rear face down, with pegs and cradles facing up.</p></section><details><summary>Separate low-profile clips</summary><a href="/tclip_low_profile_unpainted_skadis.stl" download>Unpainted SKÅDIS clip</a><a href="/tclip_low_profile_painted_skadis.stl" download>Painted SKÅDIS clip</a><small>Print {config.clipCount} at 100% infill.</small></details></aside>
    </div>
    <section id="disclaimer" className="legal-notice" aria-labelledby="disclaimer-title">
      <h2 id="disclaimer-title">Safety &amp; disclaimer</h2>
      <p>This independent hobby project is not affiliated with, endorsed by or sponsored by IKEA. IKEA and SKÅDIS names are used only to describe compatibility; their respective owners retain their rights.</p>
      <p>The tool and generated files are experimental design aids, not engineering advice or certified products. A successful preview does not establish safe fit, strength or load capacity. No load rating is provided. Print settings are starting points, not a guarantee of performance.</p>
      <p>Check dimensions, materials, print quality, fixings and compatibility yourself. Test each finished part safely with the intended load before use, inspect it regularly and replace damaged or deformed parts. Heat, ageing and sustained loads can weaken printed parts. Do not use them for safety-critical purposes, overhead loads or where failure could cause injury.</p>
      <p>To the extent permitted by law, this tool and its generated files are provided “as is” and “as available”, without warranty of accuracy, reliability or fitness for a particular purpose. No technical support, maintenance, updates or continued availability are promised.</p>
      <p>Third-party models remain subject to their own licences and attribution requirements, linked below. This notice does not change those licences.</p>
    </section>
    <footer>T-Clip seats by Line Arc Line · clips by tchoupshop · <a href="/models/ATTRIBUTION.md">Attribution</a> · <a href="/models/LICENSE.txt">Model licences</a> · <a href="/openscad/NOTICE.md">OpenSCAD engine &amp; licence</a></footer>
  </main>;
}
