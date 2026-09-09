// Cradles open toward +Y: their X and Y envelopes are different.
// Keep 2 mm between cradle walls. Base reinforcement pads may merge.
export function footSpacingLimits(c) {
  const r=c.footDiameter/2+c.footClearance+c.cradleWall;
  const roundUp=v=>Math.ceil(v*100-1e-8)/100;
  return {x:roundUp(2*r+2),y:roundUp(r+1.2+8.5+2)};
}
export function footSpacingErrors(c) {
  if(c.feetEnabled===false)return [];
  const min=footSpacingLimits(c), errors=[];
  if(c.footSpacingX<min.x)errors.push(`Foot centres X must be at least ${min.x.toFixed(2)} mm to leave 2 mm between the cradles.`);
  if(c.footSpacingY<min.y)errors.push(`Foot centres Y must be at least ${min.y.toFixed(2)} mm to leave 2 mm between the cradles.`);
  return errors;
}
