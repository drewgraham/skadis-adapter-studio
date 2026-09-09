export const RULES=['compact','peg-row','rectangle','wide','manual'];

export function selectClips(c,feet,pegs,ro,pr) {
  const rule=c.positioningRule||'compact';
  const count=c.clipCount??4;
  if(![1,2,3,4].includes(count))throw Error('Choose one to four clips.');
  if(!RULES.includes(rule))throw Error('Choose a supported positioning rule.');
  const hasFeet=feet.length>0;
  const pegHalf=Math.max(...pegs.map(p=>Math.abs(p[0])));
  const half=hasFeet?c.footSpacingX/2:Math.max(20,pegHalf+pr);
  const topY=hasFeet?feet[1][1]:0,bottomY=hasFeet?feet[3][1]:-40;
  const margin=hasFeet?ro+2:pr;
  const inside=p=>!hasFeet||!c.keepClipsInside||Math.abs(p[0])<=half;
  const clearance=p=>feet.every(f=>Math.hypot(f[0]-p[0],f[1]-p[1])>ro+16)&&pegs.every(f=>Math.hypot(f[0]-p[0],f[1]-p[1])>pr+15);
  const clear=p=>inside(p)&&clearance(p);
  const grid=(v,offset=0)=>Math.abs((v-offset)/40-Math.round((v-offset)/40))<1e-7;
  function validate(clips) {
    if(!Array.isArray(clips)||clips.length!==count)throw Error(`Set exactly ${count} clip positions.`);
    clips.forEach((p,i)=>{
      if(!Array.isArray(p)||p.length!==2||p.some(v=>!Number.isFinite(v)||Math.abs(v)>600))throw Error(`Clip ${i+1}: coordinates must be within ±600 mm.`);
      if((!grid(p[0])&&!grid(p[0],20))||!grid(p[1])||!grid(p[0]-clips[0][0]))throw Error(`Clip ${i+1} must share the same 40 mm grid as the other clips. X may use centred columns or half-pitch columns; Y uses steps of 40 mm.`);
      if(!inside(p))throw Error(`Clip ${i+1} is outside the foot centres. Move it or turn off “Keep clips inside foot centres”.`);
      if(!clearance(p))throw Error(`Clip ${i+1} is too close to a peg or cradle. Move the clip or adjust the object dimensions.`);
      for(let j=0;j<i;j++)if(Math.hypot(p[0]-clips[j][0],p[1]-clips[j][1])<36)throw Error(`Clips ${j+1} and ${i+1} overlap. Choose separate grid positions.`);
    });
    return clips.map(p=>[...p]);
  }
  if(c.lockedClips)return validate(c.lockedClips);
  if(rule==='manual')return validate(c.manualClips);
  // The board can translate relative to the object. Odd counts use a column
  // on the centreline; even counts use columns either side of the centreline.
  const phase=count%2?0:20;
  const halves=Array.from({length:Math.ceil(Math.max(half,pegHalf)/40)+3},(_,i)=>(phase||40)+40*i).filter(x=>x<=580);
  const pairClear=([x,y])=>clear([x,y])&&clear([-x,y]);
  const toClips=(top,bottom)=>[[-top[0],top[1]],top,[-bottom[0],bottom[1]],bottom];
  const topCost=([x,y])=>{
    const extraX=Math.max(0,x+18-(half+margin));
    const extraY=Math.max(0,y+18-(topY+margin))+Math.max(0,(bottomY-margin)-(y-18));
    return 4*extraX+2*extraY+Math.hypot(x-half,y-topY)+Math.hypot(x-pegHalf,y)+.12*Math.abs(x-half);
  };
  const bottomCost=([x,y])=>Math.hypot(x-half,y-bottomY)+.18*Math.hypot(x-half,y-topY)+2*Math.max(0,x-half+14)+2*Math.max(0,bottomY-y);
  const wideCost=(p,targetY)=>{
    const targetX=Math.max(20,half-18);
    // Target the outside supported areas, with explicit penalties for growing
    // beyond the foot footprint. This is not a structural load calculation.
    return 2*Math.abs(p[0]-targetX)+Math.abs(p[1]-targetY)+4*Math.max(0,p[0]+18-half-margin)+.1*Math.max(0,p[1]-topY)+2*Math.max(0,bottomY-p[1]);
  };
  const rowZero=halves.map(x=>[x,0]).filter(pairClear);
  const inboardZero=rowZero.filter(([x])=>x<=half);
  const nearby=halves.flatMap(x=>[0,40,-40,80,-80].map(y=>[x,y])).filter(pairClear);
  let tops=rule==='peg-row'?rowZero:rule==='compact'&&inboardZero.length?inboardZero:nearby;
  if(count===1){
    const rows=rule==='peg-row'?[0]:[0,...Array.from({length:15},(_,i)=>[(i+1)*40,-(i+1)*40]).flat()];
    const candidates=[0,...halves.flatMap(x=>[x,-x])].flatMap(x=>rows.map(y=>[x,y])).filter(clear);
    const cost=p=>pegs.reduce((sum,f)=>sum+Math.hypot(p[0]-f[0],p[1]-f[1]),0)/pegs.length+.05*feet.reduce((sum,f)=>sum+Math.hypot(p[0]-f[0],p[1]-f[1]),0);
    candidates.sort((a,b)=>Math.abs(a[0])-Math.abs(b[0])||cost(a)-cost(b));
    if(!candidates.length)throw Error('No clip fits with the selected rule and clearances.');
    return validate([candidates[0]]);
  }
  if(count===2){
    tops.sort((a,b)=>(rule==='wide'?wideCost(a,topY):topCost(a))-(rule==='wide'?wideCost(b,topY):topCost(b)));
    if(!tops.length)throw Error('No clip pair fits with the selected rule and clearances.');
    return validate([[-tops[0][0],tops[0][1]],tops[0]]);
  }
  let best=null,bestScore=Infinity;
  for(const top of tops){
    const maxRows=Math.max(2,Math.ceil((top[1]-bottomY)/40)+2);
    let bottom=null,bscore=Infinity;
    for(let row=1;row<=maxRows;row++)for(const x of count===3?[0]:rule==='rectangle'?[top[0]]:halves){
      const p=[x,top[1]-40*row];if(Math.abs(p[1])>600||!(count===3?clear(p):pairClear(p)))continue;
      const score=count===3?Math.abs(x)+Math.abs(p[1]-bottomY):(rule==='wide'?wideCost(p,bottomY):bottomCost(p));
      if(score<bscore){bscore=score;bottom=p;}
    }
    if(!bottom)continue;
    // Keep compact's established upper choice; rectangle/wide consider both
    // rows together so the best upper candidate cannot strand the lower row.
    const score=(rule==='wide'?wideCost(top,topY):topCost(top))+(rule==='rectangle'||rule==='wide'?bscore:0);
    if(score<bestScore){bestScore=score;best=count===3?[[-top[0],top[1]],top,bottom]:toClips(top,bottom);}
  }
  if(!best)throw Error(`The ${rule} rule cannot fit ${count} clips with these clearances${hasFeet&&c.keepClipsInside?' inside the foot centres':''}. Change the rule or inside constraint; your measurements have not been changed.`);
  return validate(best);
}
