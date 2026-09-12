"use client";
import {Button} from '@/components/ui/button';
import {Switch} from '@/components/ui/switch';
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from '@/components/ui/select';
import type {AdapterConfig} from '@/lib/model';

const rules=[
  ['compact','Automatic compact','Keeps a fitting inboard peg-row arrangement; otherwise tries nearby grid rows to reduce the footprint.'],
  ['peg-row','Upper clips on peg row','Keeps the upper clip or clips at Y = 0, level with the mounting pegs.'],
  ['rectangle','Aligned columns','Aligns lower mounts below upper mounts. With three clips, a centred triangle takes priority.'],
  ['wide','Wide stance','Targets the outer supported areas and separates the rows to provide a wider stance. This is not a load rating.'],
  ['manual','Manual grid','Choose each clip position in 40 mm steps. Odd counts start on centred columns; even counts start on half-pitch columns.'],
] as const;
export function PositioningControls({config,onChange,positions,ready}:{config:AdapterConfig;onChange:(c:AdapterConfig)=>void;positions?:[number,number][];ready:boolean}){
  const locked=!!config.lockedClips;
  const labels=Array.from({length:config.clipCount},(_,i)=>`Clip ${i+1}`);
  const changeCount=(value:string)=>{
    const clipCount=Number(value) as AdapterConfig['clipCount'];
    onChange({...config,clipCount,lockedClips:null,
      positioningRule:config.positioningRule==='manual'?'compact':config.positioningRule});
  };
  const clone=(p:[number,number][])=>p.map(v=>[...v] as [number,number]);
  return <section className="control-group positioning-controls">
    <h3>SKÅDIS positioning</h3>
    <label className="select-field"><span>Number of clips</span><Select value={String(config.clipCount)} disabled={locked} onValueChange={changeCount}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{[1,2,3,4].map(n=><SelectItem key={n} value={String(n)}>{n} {n===1?'clip':'clips'}</SelectItem>)}</SelectContent></Select></label>
    <p className="position-help">{locked?'Unlock positions to change the clip count.':config.clipCount===1?'One mount offers limited resistance to twisting.':config.clipCount===3?'Two mirrored upper mounts and one centred lower mount form a triangle.':'Four clips remain the default for the charger.'}</p>
    {config.positioningRule==='manual'&&<p className="position-help">Changing the count switches to Automatic compact. Select Manual grid again after rendering to edit the new positions.</p>}
    <Select value={config.positioningRule} disabled={locked} onValueChange={rule=>onChange({...config,positioningRule:rule as AdapterConfig['positioningRule'],manualClips:rule==='manual'&&positions?clone(positions):config.manualClips})}>
      <SelectTrigger aria-label="SKÅDIS positioning rule" className="w-full"><SelectValue/></SelectTrigger>
      <SelectContent>{rules.map(([value,label])=><SelectItem value={value} key={value} disabled={value==='manual'&&!ready&&config.positioningRule!=='manual'}>{label}</SelectItem>)}</SelectContent>
    </Select>
    <p className="position-help">{config.clipCount===1&&config.positioningRule!=='manual'&&config.positioningRule!=='peg-row'?'With one clip, automatic rules prefer the centreline.':rules.find(r=>r[0]===config.positioningRule)?.[2]}</p>
    <label className="position-toggle"><span>Keep clips inside foot centres<small>{config.feetEnabled?'Clip centres stay between the left and right foot centres.':'Available when foot supports are on.'}</small></span><Switch disabled={!config.feetEnabled} checked={config.feetEnabled&&config.keepClipsInside} onCheckedChange={keepClipsInside=>onChange({...config,keepClipsInside})}/></label>
    <label className="position-toggle"><span>Lock current clip positions<small>{locked?'Positions stay fixed while you edit the object. Clearances are still checked.':'Freeze the current layout before fine-tuning dimensions.'}</small></span><Switch checked={locked} disabled={!locked&&(!ready||!positions)} onCheckedChange={lock=>onChange({...config,lockedClips:lock&&positions?clone(positions):null})}/></label>
    {config.positioningRule==='manual'&&<div className="manual-positions">
      {config.manualClips.map((p,i)=><fieldset className="manual-clip" key={i} disabled={locked}>
        <legend>{labels[i]}</legend>
        {[0,1].map(axis=>{
          const axisName=axis===0?'X':'Y',limit=axis===0&&Math.abs(p[0]%40)>1e-7?580:600;
          const move=(delta:number)=>{const next=clone(config.manualClips);next[i][axis]=Math.max(-limit,Math.min(limit,p[axis]+delta));onChange({...config,manualClips:next});};
          return <div className="grid-stepper" key={axis}>
            <span>{axisName}</span>
            <Button type="button" variant="outline" disabled={locked||p[axis]<=-limit} aria-label={`Decrease ${labels[i]} clip ${axisName} by 40 millimetres`} onClick={()=>move(-40)}>−</Button>
            <output aria-label={`${labels[i]} clip ${axisName} in millimetres`} aria-live="polite">{p[axis]}<small> mm</small></output>
            <Button type="button" variant="outline" disabled={locked||p[axis]>=limit} aria-label={`Increase ${labels[i]} clip ${axisName} by 40 millimetres`} onClick={()=>move(40)}>+</Button>
          </div>;
        })}
      </fieldset>)}
      <p className="position-help">Origin: centre of the peg row. +X right, +Y up. Use − / + to move exactly 40 mm (one grid pitch).</p>
    </div>}
    {positions&&config.positioningRule!=='manual'&&<details className="clip-coordinates"><summary>Current clip coordinates</summary>{positions.map((p,i)=><div key={i} className="coordinate-readout"><span>{labels[i]}</span><span>X {p[0]} · Y {p[1]} mm</span></div>)}</details>}
    {locked&&<Button variant="ghost" size="sm" onClick={()=>onChange({...config,lockedClips:null})}>Unlock positions</Button>}
  </section>;
}
