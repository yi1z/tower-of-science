import type { Discipline, RelationType, Standing } from './types';
import type { Filters,Trace } from './graph';
import { disciplines,relations,standings,eras } from './config';
import { branchIndex } from './branches';
export interface ViewState extends Filters { concept:string;tour:string;step:number;trace:Trace;view:'tower'|'list';display:'language'|'formal';connections:'bundled'|'focus'|'all' }
export const defaultState:ViewState={concept:'',tour:'',step:0,trace:'neighbors',view:'tower',display:'language',connections:'bundled',branches:[],disciplines:[],era:'',standing:'',relations:Object.keys(relations) as RelationType[]};
export function parseState(hash:string):ViewState {
 const p=new URLSearchParams(hash.replace(/^#/,''));
 return {...defaultState,branches:[...new Set((p.get('branches')?.split(',')??[]).filter(id=>branchIndex.has(id)))],connections:p.get('connections')==='focus'?'focus':p.get('connections')==='all'?'all':'bundled',concept:p.get('concept')??'',tour:p.get('tour')??'',step:Math.max(0,Number.parseInt(p.get('step')??'0')||0),
  trace:['ancestors','descendants'].includes(p.get('trace')??'')?p.get('trace') as Trace:'neighbors',view:p.get('view')==='list'?'list':'tower',display:p.get('display')==='formal'?'formal':'language',
  disciplines:(p.get('fields')?.split(',')??[]).filter(d=>d in disciplines) as Discipline[],era:eras.some(e=>e.id===p.get('era'))?p.get('era')!:'',standing:p.get('standing')! in standings?p.get('standing') as Standing:'',
  relations:p.has('links')?(p.get('links')?.split(',')??[]).filter(r=>r in relations) as RelationType[]:[...defaultState.relations]};
}
export function serializeState(s:ViewState){
 const p=new URLSearchParams();if(s.branches.length)p.set('branches',s.branches.join(','));if(s.connections!=='bundled')p.set('connections',s.connections);if(s.concept)p.set('concept',s.concept);if(s.tour){p.set('tour',s.tour);p.set('step',String(s.step));}if(s.trace!=='neighbors')p.set('trace',s.trace);if(s.view!=='tower')p.set('view',s.view);if(s.display==='formal')p.set('display','formal');if(s.disciplines.length)p.set('fields',s.disciplines.join(','));if(s.era)p.set('era',s.era);if(s.standing)p.set('standing',s.standing);if(s.relations.length!==4)p.set('links',s.relations.join(','));return p.toString()?`#${p}`:'';
}
