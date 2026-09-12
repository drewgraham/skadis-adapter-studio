// Automatic placement and load-path links. Port of public/cad/positioning.mjs
// and geometry.mjs. Stable candidate ordering is intentional.
function sum_values(xs,i=0,s=0) = i>=len(xs)?s:sum_values(xs,i+1,s+xs[i]);
function all_true(xs) = len([for(x=xs) if(!x) 1])==0;
function first_best(xs) = len(xs)==0?undef:let(score=min([for(x=xs)x[0]])) [for(x=xs)if(x[0]==score)x][0];
function reflect(p) = [-p[0],p[1]];
function grid40(v) = abs(v/40-round(v/40))<0.0000001;
function auto_inside(p,feet,half) = len(feet)==0||!keep_clips_inside||abs(p[0])<=half;
function auto_clear(p,feet,pegs,ro,pr,half) = auto_inside(p,feet,half)
    &&all_true([for(f=feet)norm(f-p)>ro+16])&&all_true([for(f=pegs)norm(f-p)>pr+15]);
function pair_clear(p,feet,pegs,ro,pr,half) = auto_clear(p,feet,pegs,ro,pr,half)&&auto_clear(reflect(p),feet,pegs,ro,pr,half);
function validate_auto(clips,feet,pegs,ro,pr,half) =
    assert(len(clips)==clip_count,"No placement fits the selected rule and clearances.")
    assert(all_true([for(p=clips) len(p)==2&&is_num(p[0])&&is_num(p[1])&&abs(p[0])<=600&&abs(p[1])<=600]),"Clip coordinates must be within +/-600 mm.")
    assert(all_true([for(p=clips)(grid40(p[0])||grid40(p[0]-20))&&grid40(p[1])&&grid40(p[0]-clips[0][0])]),"Clips must share a 40 mm grid.")
    assert(all_true([for(p=clips)auto_clear(p,feet,pegs,ro,pr,half)]),"A clip overlaps a peg/cradle or is outside the selected bounds.")
    assert(all_true([for(i=[0:len(clips)-1],j=[0:len(clips)-1])if(j<i)norm(clips[i]-clips[j])>=36]),"Clip pads overlap.") clips;
function top_cost(p,half,ph,ty,by,margin) =
    4*max(0,p[0]+18-half-margin)+2*(max(0,p[1]+18-ty-margin)+max(0,by-margin-p[1]+18))
    +norm(p-[half,ty])+norm(p-[ph,0])+.12*abs(p[0]-half);
function bottom_cost(p,half,ty,by) = norm(p-[half,by])+.18*norm(p-[half,ty])+2*max(0,p[0]-half+14)+2*max(0,by-p[1]);
function wide_cost(p,target_y,half,ty,by,margin) = 2*abs(p[0]-max(20,half-18))+abs(p[1]-target_y)+4*max(0,p[0]+18-half-margin)+.1*max(0,p[1]-ty)+2*max(0,by-p[1]);
function automatic_clips(feet,pegs,ro,pr) = let(
    ph=max([for(p=pegs)abs(p[0])]),half=len(feet)>0?foot_centres_x/2:max(20,ph+pr),
    ty=len(feet)>0?feet[1][1]:0,by=len(feet)>0?feet[3][1]:-40,margin=len(feet)>0?ro+2:pr,
    phase=clip_count%2==1?40:20,
    halves=[for(i=[0:ceil(max(half,ph)/40)+2])let(x=phase+40*i)if(x<=580)x],
    rowzero=[for(x=halves)if(pair_clear([x,0],feet,pegs,ro,pr,half))[x,0]],
    inboard=[for(p=rowzero)if(p[0]<=half)p],
    nearby=[for(x=halves,y=[0,40,-40,80,-80])if(pair_clear([x,y],feet,pegs,ro,pr,half))[x,y]],
    tops=positioning_rule=="peg-row"?rowzero:positioning_rule=="compact"&&len(inboard)>0?inboard:nearby,
    rows=positioning_rule=="peg-row"?[0]:concat([0],[for(i=[1:15])each[i*40,-i*40]]),
    singles=clip_count!=1?[]:[for(x=concat([0],[for(h=halves)each[h,-h]]),y=rows)let(p=[x,y])if(auto_clear(p,feet,pegs,ro,pr,half))
       [abs(x),sum_values([for(f=pegs)norm(p-f)])/len(pegs)+.05*sum_values([for(f=feet)norm(p-f)]),p]],
    minx=len(singles)>0?min([for(s=singles)s[0]]):0,
    single=first_best([for(s=singles)if(s[0]==minx)[s[1],s[2]]]),
    pair=first_best([for(t=tops)[positioning_rule=="wide"?wide_cost(t,ty,half,ty,by,margin):top_cost(t,half,ph,ty,by,margin),t]]),
    arrangements=clip_count<3?[]:[for(t=tops)let(
       bottoms=[for(row=[1:max(2,ceil((t[1]-by)/40)+2)],x=clip_count==3?[0]:positioning_rule=="rectangle"?[t[0]]:halves)
         let(p=[x,t[1]-40*row])if(abs(p[1])<=600&&(clip_count==3?auto_clear(p,feet,pegs,ro,pr,half):pair_clear(p,feet,pegs,ro,pr,half)))
         [clip_count==3?abs(x)+abs(p[1]-by):positioning_rule=="wide"?wide_cost(p,by,half,ty,by,margin):bottom_cost(p,half,ty,by),p]],
       b=first_best(bottoms))if(!is_undef(b))
       [(positioning_rule=="wide"?wide_cost(t,ty,half,ty,by,margin):top_cost(t,half,ph,ty,by,margin))+((positioning_rule=="rectangle"||positioning_rule=="wide")?b[0]:0),
        clip_count==3?[reflect(t),t,b[1]]:[reflect(t),t,reflect(b[1]),b[1]]]],
    arrangement=first_best(arrangements),
    selected=lock_clips?manual_clip_positions:positioning_rule=="manual"?manual_clip_positions:
      clip_count==1?(is_undef(single)?[]:[single[1]]):clip_count==2?(is_undef(pair)?[]:[reflect(pair[1]),pair[1]]):(is_undef(arrangement)?[]:arrangement[1])
) validate_auto(selected,feet,pegs,ro,pr,half);

function as_link(a,b) = [a[0],b[0],a[1],b[1]];
function tree_links(connected,pending,links=[]) = len(pending)==0?links:let(
    best=first_best([for(a=connected,i=[0:len(pending)-1])[norm(a[0]-pending[i][0]),a,i]]),b=pending[best[2]])
    tree_links(concat(connected,[b]),[for(i=[0:len(pending)-1])if(i!=best[2])pending[i]],concat(links,[as_link(best[1],b)]));
function same_point(a,b) = norm(a-b)<0.0000001;
function same_edge(a,b) = (same_point(a[0],b[0])&&same_point(a[1],b[1]))||(same_point(a[0],b[1])&&same_point(a[1],b[0]));
function mirror_links(links,nodes,i=0,out=undef) = let(acc=is_undef(out)?links:out)
    i>=len(links)?acc:let(l=links[i],a=reflect(l[0]),b=reflect(l[1]),edge=[a,b,l[2],l[3]],
    exists=len([for(n=nodes)if(same_point(n[0],a))1])>0&&len([for(n=nodes)if(same_point(n[0],b))1])>0,
    duplicate=len([for(e=acc)if(same_edge(e,edge))1])>0)
    mirror_links(links,nodes,i+1,exists&&!duplicate?concat(acc,[edge]):acc);
// Stable sort by X, including equal-X pad insertion order.
function sort_nodes(xs) = len(xs)<=1?xs:let(p=xs[0],rest=[for(i=[1:len(xs)-1])xs[i]])
    concat(sort_nodes([for(x=rest)if(x[0][0]<p[0][0])x]),[p],sort_nodes([for(x=rest)if(x[0][0]>=p[0][0])x]));
function automatic_links(feet,pegs,clips,ro,pr) = let(
    nodes=concat([for(p=clips)[p,18]],[for(p=pegs)[p,pr]],[for(p=feet)[p,ro+2]]),
    small=len(clips)<4?concat(tree_links([nodes[0]],[for(i=[1:len(nodes)-1])nodes[i]]),
       len(clips)==3?[for(i=[0:1])[clips[i],clips[2],18,18]]:[],
       len(feet)>0?[for(i=[0:1])[feet[i],feet[i+2],ro+2,ro+2]]:[]):[],
    top=len(clips)<4?[]:sort_nodes(concat(len(feet)>0?[for(i=[0:1])[feet[i],ro+2]]:[],[for(p=pegs)[p,pr]],[for(i=[0:1])[clips[i],18]])))
    len(clips)<4?mirror_links(small,nodes):concat([for(i=[1:len(top)-1])as_link(top[i-1],top[i])],
       [for(i=[0:1])each(len(feet)>0?[[feet[i],clips[i+2],ro+2,18],[clips[i+2],feet[i+2],18,ro+2]]:[[clips[i],clips[i+2],18,18]])]);
