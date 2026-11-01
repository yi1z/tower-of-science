import type { Atlas, Concept, Relationship, Discipline, RelationType, Standing } from './types';
import { eraFor, eras } from './config';
import { branches, sectionOrder } from './branches';
export function indexGraph(atlas:Pick<Atlas,'concepts'|'relationships'>) {
 const byId=new Map(atlas.concepts.map(c=>[c.id,c]));
 const incoming=new Map<string,Relationship[]>(), outgoing=new Map<string,Relationship[]>();
 for(const c of atlas.concepts){incoming.set(c.id,[]);outgoing.set(c.id,[]);}
 for(const e of atlas.relationships){ incoming.get(e.target)?.push(e); outgoing.get(e.source)?.push(e); }
 const walk=(id:string,direction:'incoming'|'outgoing',allowed?:Set<RelationType>)=>{
  const visited=new Set<string>(), queue=[id], map=direction==='incoming'?incoming:outgoing;
  while(queue.length){ for(const e of map.get(queue.pop()!)??[]){if(allowed&&!allowed.has(e.type))continue; const next=direction==='incoming'?e.source:e.target;if(next!==id&&!visited.has(next)){visited.add(next);queue.push(next);}} }
  return visited;
 };
 const direct=(id:string)=>new Set((outgoing.get(id)??[]).filter(e=>e.evidence!=='contested').map(e=>e.target)).size;
 const pillars=atlas.concepts.filter(c=>direct(c.id)>=5).sort((a,b)=>direct(b.id)-direct(a.id)||walk(b.id,'outgoing').size-walk(a.id,'outgoing').size||a.title.localeCompare(b.title));
 return {byId,incoming,outgoing,walk,direct,pillars};
}
export interface Filters { disciplines:Discipline[];branches:string[];era:string;standing:Standing|'';relations:RelationType[] }
export type Trace = 'neighbors'|'ancestors'|'descendants';
export function filterGraph(concepts:Concept[], edges:Relationship[],filters:Filters,selected:string,trace:Trace,index:ReturnType<typeof indexGraph>){
 const matching=new Set(concepts.filter(c=>(!filters.disciplines.length||filters.disciplines.includes(c.discipline))&&(!filters.branches.length||filters.branches.includes(c.branchId))&&(!filters.era||eraFor(c.date.year).id===filters.era)&&(!filters.standing||filters.standing===c.standing)).map(c=>c.id));
 const visible=new Set(matching),highlight=new Set<string>(),types=new Set(filters.relations);
 if(selected&&index.byId.has(selected)){
  visible.add(selected);highlight.add(selected);
  if(trace==='ancestors'||trace==='descendants')index.walk(selected,trace==='ancestors'?'incoming':'outgoing',types).forEach(id=>{visible.add(id);highlight.add(id);});
  else [...index.incoming.get(selected)??[],...index.outgoing.get(selected)??[]].filter(e=>types.has(e.type)).forEach(e=>{visible.add(e.source);visible.add(e.target);highlight.add(e.source);highlight.add(e.target);});
 }
 return {matching,visible,highlight,edges:edges.filter(e=>types.has(e.type)&&visible.has(e.source)&&visible.has(e.target))};
}
export const NODE_WIDTH=320, NODE_HEIGHT=232, COLUMN_GAP=72, ROW_GAP=124;
const BRANCH_PAD=32, SECTION_GAP=96, ERA_GAP=260;
export interface Point { x:number;y:number }
export interface Region { id:string;eraId:string;discipline:Discipline;left:number;width:number;top:number;bottom:number }
export interface Floor { id:string;eraId:string;year:number;end:number;label:string;y:number;width:number;ids:string[] }
const yearLabel=(year:number)=>year<0?`${Math.abs(year)} BCE`:`${year} CE`;
export function periodFor(year:number){
 const era=eraFor(year),eraIndex=eras.indexOf(era),eraStart=eraIndex?eras[eraIndex-1].max:-Infinity;
 const size=year<-5000?Infinity:year<-500?500:year<1500?100:year<1850?25:year<1900?10:5;
 const start=size===Infinity?-Infinity:Math.max(eraStart,Math.floor(year/size)*size);
 const end=Math.min(era.max,start===-Infinity?-5000:start+size);
 return {id:`${era.id}:${start}`,eraId:era.id,year:start,end,label:start===-Infinity?'Before 5000 BCE':`${yearLabel(start===0?1:start)} – ${yearLabel(end-1===0?-1:end-1)}`};
}
export function layoutGraph(concepts:Concept[]){
 const positions=new Map<string,Point>(),nodeFloor=new Map<string,string>();
 const bands:{id:string;top:number;bottom:number;left:number;width:number}[]=[];
 const rows:Floor[]=[],regions:Region[]=[],sections:Region[]=[];
 let distance=0;
 for(const era of eras){
  const items=concepts.filter(c=>eraFor(c.date.year).id===era.id).sort((a,b)=>a.date.year-b.date.year||a.id.localeCompare(b.id));
  if(!items.length)continue;
  const floors=[...new Map(items.map(c=>{const p=periodFor(c.date.year);return [p.id,p];})).values()].sort((a,b)=>a.year-b.year);
  const activeBranches=branches.filter(b=>items.some(c=>c.branchId===b.id));
  const widths=new Map(activeBranches.map(b=>{const n=Math.max(...floors.map(f=>items.filter(c=>c.branchId===b.id&&periodFor(c.date.year).id===f.id).length));return [b.id,n*NODE_WIDTH+(n-1)*COLUMN_GAP+BRANCH_PAD*2];}));
  const activeSections=sectionOrder.filter(d=>activeBranches.some(b=>b.discipline===d));
  const totalWidth=activeBranches.reduce((sum,b)=>sum+widths.get(b.id)!,0)+(activeSections.length-1)*SECTION_GAP+64;
  const bottom=-distance+NODE_HEIGHT+62,top=-distance-(floors.length-1)*(NODE_HEIGHT+ROW_GAP)-118;
  let x=-totalWidth/2+32;
  for(const discipline of activeSections){
   const left=x;
   for(const branch of activeBranches.filter(b=>b.discipline===discipline).sort((a,b)=>a.order-b.order)){
    const width=widths.get(branch.id)!;
    regions.push({id:branch.id,eraId:era.id,discipline,left:x,width,top,bottom});
    for(const [i,floor] of floors.entries()){
     const group=items.filter(c=>c.branchId===branch.id&&periodFor(c.date.year).id===floor.id);
     const groupWidth=group.length*NODE_WIDTH+Math.max(0,group.length-1)*COLUMN_GAP;
     group.forEach((c,j)=>{positions.set(c.id,{x:x+(width-groupWidth)/2+j*(NODE_WIDTH+COLUMN_GAP),y:-distance-i*(NODE_HEIGHT+ROW_GAP)});nodeFloor.set(c.id,floor.id);});
    }
    x+=width;
   }
   sections.push({id:discipline,eraId:era.id,discipline,left,width:x-left,top,bottom});x+=SECTION_GAP;
  }
  for(const [i,floor] of floors.entries())rows.push({...floor,y:-distance-i*(NODE_HEIGHT+ROW_GAP),width:totalWidth,ids:items.filter(c=>periodFor(c.date.year).id===floor.id).map(c=>c.id)});
  bands.push({id:era.id,top,bottom,left:-totalWidth/2,width:totalWidth});
  distance+=floors.length*(NODE_HEIGHT+ROW_GAP)+ERA_GAP;
 }
 const width=Math.max(640,...bands.map(b=>b.width));
 return {positions,bands,rows,regions,sections,nodeFloor,width,left:-width/2,right:width/2,centerX:0};
}
export type Layout=ReturnType<typeof layoutGraph>;
export function eraBandAt(layout:Layout,y:number){
 return layout.bands.find(b=>y>=b.top&&y<=b.bottom)??[...layout.bands].sort((a,b)=>Math.min(Math.abs(a.top-y),Math.abs(a.bottom-y))-Math.min(Math.abs(b.top-y),Math.abs(b.bottom-y)))[0];
}
export interface Route { points:Point[];path:string;label:Point }
/** React Flow's endpoint bounds include large empty pillar areas. Cull using the actual route. */
export function routeInViewport(route:Route|undefined,transform:[number,number,number],width:number,height:number){
 if(!route)return false;
 const [x,y,zoom]=transform,pad=32/zoom,left=-x/zoom-pad,right=(width-x)/zoom+pad,top=-y/zoom-pad,bottom=(height-y)/zoom+pad;
 for(let i=1;i<route.points.length;i++){
  const a=route.points[i-1],b=route.points[i];
  if(Math.max(a.x,b.x)>=left&&Math.min(a.x,b.x)<=right&&Math.max(a.y,b.y)>=top&&Math.min(a.y,b.y)<=bottom)return true;
 }
 return false;
}
const hash=(id:string)=>[...id].reduce((v,c)=>(v*31+c.charCodeAt(0))>>>0,7);
export function roundedPath(points:Point[],radius=8){
 if(!points.length)return '';
 let result=`M ${points[0].x} ${points[0].y}`;
 for(let i=1;i<points.length-1;i++){
  const a=points[i-1],b=points[i],c=points[i+1],ab=Math.hypot(b.x-a.x,b.y-a.y),bc=Math.hypot(c.x-b.x,c.y-b.y);
  if(!ab||!bc)continue;
  const r=Math.min(radius,ab/2,bc/2),before={x:b.x+(a.x-b.x)*r/ab,y:b.y+(a.y-b.y)*r/ab},after={x:b.x+(c.x-b.x)*r/bc,y:b.y+(c.y-b.y)*r/bc};
  result+=` L ${before.x} ${before.y} Q ${b.x} ${b.y} ${after.x} ${after.y}`;
 }
 const end=points.at(-1)!;return `${result} L ${end.x} ${end.y}`;
}
// Move only in empty floor gutters. Every vertical segment crossing a floor uses
// a free x interval for that floor, including when sections shift between eras.
export function routeRelationships(layout:Layout,relationships:Relationship[]){
 const result=new Map<string,Route>();
 const freeX=(row:Floor,wanted:number,track:number)=>{
  const blocks=row.ids.map(id=>layout.positions.get(id)!).map(p=>[p.x-20,p.x+NODE_WIDTH+20]).sort((a,b)=>a[0]-b[0]);
  if(!blocks.some(([l,r])=>wanted>l&&wanted<r))return wanted;
  const candidates=blocks.flatMap(([l,r])=>[l-track,r+track]).filter(v=>!blocks.some(([l,r])=>v>l&&v<r));
  return candidates.sort((a,b)=>Math.abs(a-wanted)-Math.abs(b-wanted)||a-b)[0];
 };
 const incoming=new Map<string,string[]>(),outgoing=new Map<string,string[]>();
 for(const e of [...relationships].sort((a,b)=>a.id.localeCompare(b.id))){incoming.set(e.target,[...incoming.get(e.target)??[],e.id]);outgoing.set(e.source,[...outgoing.get(e.source)??[],e.id]);}
 const port=(map:Map<string,string[]>,id:string,edge:string)=>{const ids=map.get(id)!;return ids.length===1?0:(ids.indexOf(edge)/(ids.length-1)-.5)*100;};
 for(const e of relationships){
  const s=layout.positions.get(e.source),t=layout.positions.get(e.target);if(!s||!t)continue;
  const n=hash(e.id),track=4+n%12,gutter=32+n%48;
  const source={x:s.x+NODE_WIDTH/2+port(outgoing,e.source,e.id),y:s.y},target={x:t.x+NODE_WIDTH/2+port(incoming,e.target,e.id),y:t.y+NODE_HEIGHT};
  const points:Point[]=[source,{x:source.x,y:source.y-gutter}];
  if(s.y===t.y){
   const row=layout.rows.find(r=>r.id===layout.nodeFloor.get(e.source))!;
   const x=freeX(row,(source.x+target.x)/2,track);
   points.push({x,y:source.y-gutter},{x,y:target.y+gutter},{x:target.x,y:target.y+gutter});
  }else{
   const crossed=layout.rows.filter(r=>r.y<s.y&&r.y>t.y).sort((a,b)=>b.y-a.y);
   let x=source.x,y=source.y-gutter;
   for(const row of crossed){
    const nextX=freeX(row,x,track);
    points.push({x:nextX,y},{x:nextX,y:row.y-gutter});x=nextX;y=row.y-gutter;
   }
   const approach=target.y+gutter;
   points.push({x,y:approach},{x:target.x,y:approach});
  }
  points.push(target);
  const clean=points.filter((p,i)=>!i||p.x!==points[i-1].x||p.y!==points[i-1].y);
  let longest=0,label=clean[0];for(let i=1;i<clean.length;i++){const a=clean[i-1],b=clean[i],length=Math.hypot(b.x-a.x,b.y-a.y);if(length>longest){longest=length;label={x:(a.x+b.x)/2,y:(a.y+b.y)/2};}}
  result.set(e.id,{points:clean,path:roundedPath(clean),label});
 }
 return result;
}
export interface Bundle { id:string;level:'section'|'branch';sourceGroup:string;targetGroup:string;sourceEra:string;targetEra:string;type:RelationType;evidence:Relationship['evidence'];memberIds:string[];routeId:string }
export function buildBundles(concepts:Concept[],relationships:Relationship[]){
 const lookup=new Map(concepts.map(c=>[c.id,c])),result:Bundle[]=[];
 for(const level of ['section','branch'] as const){
  const groups=new Map<string,Bundle>();
  for(const e of [...relationships].sort((a,b)=>a.id.localeCompare(b.id))){
   const source=lookup.get(e.source)!,target=lookup.get(e.target)!;
   const sourceGroup=level==='section'?source.discipline:source.branchId,targetGroup=level==='section'?target.discipline:target.branchId,sourceEra=eraFor(source.date.year).id,targetEra=eraFor(target.date.year).id;
   const id=['bundle',level,sourceGroup,targetGroup,sourceEra,targetEra,e.type,e.evidence].join(':');
   if(!groups.has(id))groups.set(id,{id,level,sourceGroup,targetGroup,sourceEra,targetEra,type:e.type,evidence:e.evidence,memberIds:[],routeId:e.id});
   groups.get(id)!.memberIds.push(e.id);
  }
  result.push(...groups.values());
 }
 return result;
}
export function visibleBundles(bundles:Bundle[],edges:Relationship[],level:Bundle['level'],individualIds:Set<string>=new Set()){
 const allowed=new Set(edges.map(e=>e.id));
 return bundles.filter(b=>b.level===level).map(b=>({...b,memberIds:b.memberIds.filter(id=>allowed.has(id)&&!individualIds.has(id))})).filter(b=>b.memberIds.length);
}
export const searchConcepts=(concepts:Concept[],query:string)=>{
 const q=query.trim().toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
 if(!q)return [];
 const norm=(s:string)=>s.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
 return concepts.filter(c=>norm([c.title,...c.aliases,...c.contributors.map(p=>p.name)].join(' ')).includes(q)).sort((a,b)=>Number(norm(b.title).startsWith(q))-Number(norm(a.title).startsWith(q))||a.date.year-b.date.year);
};
