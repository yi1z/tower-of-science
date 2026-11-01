import type { Atlas, Concept, Relationship, Discipline, RelationType, Standing } from './types';
import { eraFor, eras } from './config';
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
export interface Filters { disciplines:Discipline[];era:string;standing:Standing|'';relations:RelationType[] }
export type Trace = 'neighbors'|'ancestors'|'descendants';
export function filterGraph(concepts:Concept[], edges:Relationship[],filters:Filters,selected:string,trace:Trace,index:ReturnType<typeof indexGraph>){
 const matching=new Set(concepts.filter(c=>(!filters.disciplines.length||filters.disciplines.includes(c.discipline))&&(!filters.era||eraFor(c.date.year).id===filters.era)&&(!filters.standing||filters.standing===c.standing)).map(c=>c.id));
 const visible=new Set(matching),highlight=new Set<string>(),types=new Set(filters.relations);
 if(selected&&index.byId.has(selected)){
  visible.add(selected);highlight.add(selected);
  if(trace==='ancestors'||trace==='descendants')index.walk(selected,trace==='ancestors'?'incoming':'outgoing',types).forEach(id=>{visible.add(id);highlight.add(id);});
  else [...index.incoming.get(selected)??[],...index.outgoing.get(selected)??[]].filter(e=>types.has(e.type)).forEach(e=>{visible.add(e.source);visible.add(e.target);highlight.add(e.source);highlight.add(e.target);});
 }
 return {matching,visible,highlight,edges:edges.filter(e=>types.has(e.type)&&visible.has(e.source)&&visible.has(e.target))};
}
const lanes:Discipline[]=['mathematics','methods','computing','physics','astronomy','chemistry','biology','earth','society'];
export const NODE_WIDTH=248, NODE_HEIGHT=154, COLUMN_GAP=44, ROW_GAP=42;
export function layoutGraph(concepts:Concept[]){
 const positions=new Map<string,{x:number;y:number}>();
 const bands:{id:string;top:number;bottom:number;left:number;width:number}[]=[];
 const rows:{year:number;y:number;width:number;ids:string[]}[]=[];
 let distance=0;
 for(const era of eras){
  const items=concepts.filter(c=>eraFor(c.date.year).id===era.id).sort((a,b)=>a.date.year-b.date.year||a.id.localeCompare(b.id));
  const start=distance;
  const years=[...new Set(items.map(c=>c.date.year))];
  let eraWidth=640;
  for(const year of years){
   const group=items.filter(c=>c.date.year===year).sort((a,b)=>lanes.indexOf(a.discipline)-lanes.indexOf(b.discipline)||a.id.localeCompare(b.id));
   const width=group.length*NODE_WIDTH+(group.length-1)*COLUMN_GAP;
   group.forEach((c,i)=>positions.set(c.id,{x:-width/2+i*(NODE_WIDTH+COLUMN_GAP),y:-distance}));
   rows.push({year,y:-distance,width,ids:group.map(c=>c.id)});
   eraWidth=Math.max(eraWidth,width+112);
   distance+=NODE_HEIGHT+ROW_GAP;
  }
  distance=Math.max(distance,start+300);
  bands.push({id:era.id,top:-distance-25,bottom:-start+NODE_HEIGHT+30,left:-eraWidth/2,width:eraWidth});distance+=210;
 }
 const width=Math.max(...bands.map(b=>b.width));
 return {positions,bands,rows,width,left:-width/2,right:width/2,centerX:0};
}
export const searchConcepts=(concepts:Concept[],query:string)=>{
 const q=query.trim().toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
 if(!q)return [];
 const norm=(s:string)=>s.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
 return concepts.filter(c=>norm([c.title,...c.aliases,...c.contributors.map(p=>p.name)].join(' ')).includes(q)).sort((a,b)=>Number(norm(b.title).startsWith(q))-Number(norm(a.title).startsWith(q))||a.date.year-b.date.year);
};
