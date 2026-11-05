import type {Concept,Discipline,Relationship} from './types';
import {eraFor} from './config';
import {NODE_HEIGHT,NODE_WIDTH,finishRoute,type Bundle,type Layout,type Point,type Route,type RouteObstacle} from './graph';

export type SummaryLevel='cards'|'branch'|'section';
export function summaryLevel(zoom:number,previous:SummaryLevel='cards'):SummaryLevel {
 if(previous==='section'&&zoom<.14)return 'section';
 if(zoom<.12)return 'section';
 if(previous!=='cards'&&zoom<.36)return 'branch';
 return zoom<.32?'branch':'cards';
}
export interface BranchSummary {
 id:string; groupId:string; eraId:string; discipline:Discipline; memberIds:string[];
 level:'section'|'branch'; position:Point; anchor:Point; width:number; height:number;
}
export interface SummaryView { summaries:BranchSummary[]; endpoints:Map<string,string>; byId:Map<string,BranchSummary> }
export const regionId=(level:'section'|'branch',eraId:string,id:string)=>`region:${level}:${eraId}:${id}`;
const catalogs=new WeakMap<Concept[],Map<string,string[]>>();
function membersByRegion(concepts:Concept[]){
 let catalog=catalogs.get(concepts);if(catalog)return catalog;
 catalog=new Map();
 for(const c of concepts)for(const level of ['section','branch'] as const){
  const id=regionId(level,eraFor(c.date.year).id,level==='section'?c.discipline:c.branchId);
  if(!catalog.has(id))catalog.set(id,[]);catalog.get(id)!.push(c.id);
 }
 for(const members of catalog.values())members.sort();catalogs.set(concepts,catalog);return catalog;
}
/** The historical pillar is the summary. Its geometry never depends on camera scale. */
export function buildSummaryView(concepts:Concept[],layout:Layout,visible:Set<string>,active:Set<string>,level:SummaryLevel):SummaryView {
 const endpoints=new Map<string,string>(),summaries:BranchSummary[]=[],byId=new Map<string,BranchSummary>();
 if(level==='cards')return {summaries,endpoints,byId};
 const catalog=membersByRegion(concepts);
 for(const region of level==='section'?layout.sections:layout.regions){
  const id=regionId(level,region.eraId,region.id),members=(catalog.get(id)??[]).filter(id=>visible.has(id));
  if(!members.length||members.some(id=>active.has(id)))continue;
  const summary:BranchSummary={id,groupId:region.id,eraId:region.eraId,discipline:region.discipline,level,memberIds:members,position:{x:region.left,y:region.top},anchor:{x:region.left+region.width/2,y:(region.top+region.bottom)/2},width:region.width,height:region.bottom-region.top};
  summaries.push(summary);byId.set(id,summary);members.forEach(member=>endpoints.set(member,id));
 }
 return {summaries,endpoints,byId};
}

/** Measured once per title/font; all subsequent fitting is arithmetic, with no layout reads. */
export function fitPillarTitle(width:number,height:number,zoom:number,textWidth:number,fontSize:number){
 const w=Math.max(1,width*zoom-8),h=Math.max(1,height*zoom-8),lineHeight=fontSize*1.2;
 const rotated=textWidth>w&&h>w;
 const availableWidth=rotated?h:w,availableHeight=rotated?w:h;
 const scale=Math.min(1,availableWidth/textWidth,availableHeight/lineHeight);
 const showCount=availableHeight>=lineHeight+18&&scale>=.9;
 return {rotated,scale,showCount};
}

export function summaryBundles(edges:Relationship[],view:SummaryView,concepts:Map<string,Concept>,level:'section'|'branch'):Bundle[] {
 const groups=new Map<string,Bundle>();
 for(const edge of edges){
  if(!view.endpoints.has(edge.source)&&!view.endpoints.has(edge.target))continue;
  const source=concepts.get(edge.source)!,target=concepts.get(edge.target)!;
  const from=view.endpoints.get(edge.source)??edge.source,to=view.endpoints.get(edge.target)??edge.target;
  const id=['overview',from,to,edge.type,edge.evidence].join('|');
  if(!groups.has(id))groups.set(id,{id,level,sourceGroup:level==='section'?source.discipline:source.branchId,targetGroup:level==='section'?target.discipline:target.branchId,sourceEra:eraFor(source.date.year).id,targetEra:eraFor(target.date.year).id,type:edge.type,evidence:edge.evidence,memberIds:[],routeId:edge.id});
  groups.get(id)!.memberIds.push(edge.id);
 }
 return [...groups.values()];
}

const routeCaches=new WeakMap<Layout,Map<string,Route>>();
const pillarObstacles=new WeakMap<Layout,RouteObstacle[]>();
/** Escape through a branch's card-free margin, then travel through shared era gutters.
 * Reserved section gaps stay clear at every presentation level and under every filter. */
export function summaryRoute(source:string,target:string,view:SummaryView,layout:Layout,track=0):Route {
 let cache=routeCaches.get(layout);if(!cache){cache=new Map();routeCaches.set(layout,cache);}
 const key=`${source}|${target}|${track%7}`,cached=cache.get(key);if(cached)return cached;
 const offset=18+track%7*3;
 const endpoint=(id:string,outgoing:boolean)=>{
  const summary=view.byId.get(id);
  const p=summary?.position??layout.positions.get(id)!;
  const region=summary?null:layout.regions.find(r=>p.x>=r.left&&p.x<r.left+r.width&&p.y>=r.top&&p.y<r.bottom)!;
  const band=layout.bands.find(b=>b.id===(summary?.eraId??region!.eraId))!;
  const port={x:p.x+(summary?.width??NODE_WIDTH)/2,y:p.y+(outgoing?0:summary?.height??NODE_HEIGHT)};
  const escapeY=outgoing?band.top-offset:band.bottom+offset;
  const points:Point[]=summary?[port,{x:port.x,y:escapeY}]:[port,{x:port.x,y:port.y+(outgoing?-16:16)},{x:region!.left+16,y:port.y+(outgoing?-16:16)},{x:region!.left+16,y:escapeY}];
  return {band,points};
 };
 const s=endpoint(source,true),t=endpoint(target,false),points=[...s.points];
 let current=points.at(-1)!;
 const cross=(band:Layout['bands'][number],up:boolean)=>{
  const sections=layout.sections.filter(r=>r.eraId===band.id).sort((a,b)=>a.left-b.left);
  const lanes=[band.left-offset,band.left+band.width+offset,...sections.slice(1).map((r,i)=>(sections[i].left+sections[i].width+r.left)/2+(track%7-3)*3)];
  const x=lanes.sort((a,b)=>Math.abs(a-current.x)-Math.abs(b-current.x)||a-b)[0];
  const enter=up?band.bottom+offset:band.top-offset,exit=up?band.top-offset:band.bottom+offset;
  points.push({x:current.x,y:enter},{x,y:enter},{x,y:exit});current=points.at(-1)!;
 };
 const si=layout.bands.indexOf(s.band),ti=layout.bands.indexOf(t.band);
 if(si===ti)cross(s.band,false);
 else for(let i=si+1;i<ti;i++)cross(layout.bands[i],true);
 const approach=t.points.at(-1)!;
 points.push({x:current.x,y:approach.y},...[...t.points].reverse());
 let obstacles=pillarObstacles.get(layout);
 if(!obstacles){
  obstacles=layout.sections.map(r=>({left:r.left,right:r.left+r.width,top:r.top,bottom:r.bottom}));
  pillarObstacles.set(layout,obstacles);
 }
 const route=finishRoute(points,6,obstacles);cache.set(key,route);return route;
}
