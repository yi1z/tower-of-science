import type { Atlas } from './types';
import { disciplines, relations, standings } from './config';
import { branches,branchIndex,sectionOrder,branchVersion } from './branches';
export function validateAtlas(atlas:Atlas){
 const errors:string[]=[];
 if(!branchVersion||new Set(branches.map(b=>b.id)).size!==branches.length)errors.push('Branch catalog: missing version or duplicate IDs');
 if(sectionOrder.length!==12||new Set(sectionOrder).size!==12)errors.push('Branch catalog: twelve unique major sections required');
 for(const b of branches)if(!b.label||!sectionOrder.includes(b.discipline)||!Number.isInteger(b.order)||b.order<0)errors.push(`Branch catalog: invalid ${b.id}`);
 for(const d of sectionOrder){const entries=branches.filter(b=>b.discipline===d);if(new Set(entries.map(b=>b.order)).size!==entries.length)errors.push(`Branch catalog: duplicate order in ${d}`);}
 const unique=(items:{id:string}[],type:string)=>{const ids=new Set<string>();for(const i of items){if(!i.id||ids.has(i.id))errors.push(`${type}: duplicate or empty ID ${i.id}`);ids.add(i.id);}return ids;};
 const ids=unique(atlas.concepts,'Concept'),sourceIds=unique(atlas.sources,'Source');unique(atlas.relationships,'Relationship');unique(atlas.tours,'Tour');
 const lookup=new Map(atlas.concepts.map(c=>[c.id,c]));
 const refs=(list:string[]|undefined,context:string)=>{if(!Array.isArray(list)||!list.length){errors.push(`${context}: no citations`);return;}for(const id of list)if(!sourceIds.has(id))errors.push(`${context}: unknown source ${id}`);};
 for(const c of atlas.concepts){
  for(const field of ['title','summary','problem','development','limitations'] as const)if(typeof c[field]!=='string'||c[field].trim().length<3)errors.push(`${c.id}: missing ${field}`);
  if(!(c.discipline in disciplines))errors.push(`${c.id}: invalid discipline`);
  if(!branchIndex.has(c.branchId)||branchIndex.get(c.branchId)?.discipline!==c.discipline)errors.push(`${c.id}: invalid primary branch or discipline mismatch`);
  if(c.relatedBranchIds&&(new Set(c.relatedBranchIds).size!==c.relatedBranchIds.length||c.relatedBranchIds.some(id=>!branchIndex.has(id)||id===c.branchId)))errors.push(`${c.id}: invalid related branches`);
  if(!(c.standing in standings))errors.push(`${c.id}: invalid standing`);
  if(!['concept','theory','method','discovery','mathematics','instrument'].includes(c.kind))errors.push(`${c.id}: invalid kind`);
  if(!Number.isInteger(c.date?.year)||c.date.year===0||c.date.year>2026||!c.date.label)errors.push(`${c.id}: invalid date`);
  if(!['exact','approximate','range'].includes(c.date?.precision))errors.push(`${c.id}: invalid date precision`);
  if(c.date.precision!=='exact'&&!c.date.note?.trim())errors.push(`${c.id}: uncertain date lacks explanation`);
  if(!Array.isArray(c.aliases)||!Array.isArray(c.tags))errors.push(`${c.id}: aliases and tags must be arrays`);
  if(!c.contributors?.length||c.contributors.some(p=>!p.name||!p.role))errors.push(`${c.id}: incomplete attribution`);
  refs(c.sourceIds,c.id);refs(c.claimSources?.summary,`${c.id} summary`);refs(c.claimSources?.history,`${c.id} history`);
  if(c.representation){
   const r=c.representation;
   if(!['formula','definition'].includes(r.kind)||!r.expression?.trim()||!r.explanation?.trim())errors.push(`${c.id}: incomplete representation`);
   refs(r.sourceIds,`${c.id} representation`);
  }
 }
 const pairs=new Set<string>(),out=new Map<string,string[]>();
 for(const e of atlas.relationships){
  if(!ids.has(e.source)||!ids.has(e.target))errors.push(`${e.id}: missing endpoint ${e.source} → ${e.target}`);
  if(e.source===e.target)errors.push(`${e.id}: self-loop`);
  if(!(e.type in relations))errors.push(`${e.id}: invalid relationship type`);
  if(!['documented','conceptual','contested'].includes(e.evidence))errors.push(`${e.id}: invalid evidence classification`);
  if(!e.explanation?.trim())errors.push(`${e.id}: missing explanation`);
  const pair=`${e.source}→${e.target}`;if(pairs.has(pair))errors.push(`${e.id}: duplicate directed pair`);pairs.add(pair);
  if(lookup.has(e.source)&&lookup.has(e.target)&&lookup.get(e.source)!.date.year>lookup.get(e.target)!.date.year)errors.push(`${e.id}: chronology reverses ${lookup.get(e.source)!.date.year} → ${lookup.get(e.target)!.date.year}`);
  refs(e.sourceIds,e.id);out.set(e.source,[...(out.get(e.source)??[]),e.target]);
 }
 const visited=new Set<string>(),active=new Set<string>();
 function visit(id:string){if(active.has(id)){errors.push(`Cycle involving ${id}`);return;}if(visited.has(id))return;active.add(id);for(const next of out.get(id)??[])visit(next);active.delete(id);visited.add(id);}
 ids.forEach(visit);
 for(const s of atlas.sources){try{const u=new URL(s.url);if(!['http:','https:'].includes(u.protocol))throw Error();}catch{errors.push(`${s.id}: invalid URL`);}if(!s.title||!s.publisher)errors.push(`${s.id}: incomplete source metadata`);}
 for(const t of atlas.tours){if(!t.title||!t.subtitle||!/^#[0-9a-f]{6}$/i.test(t.color))errors.push(`${t.id}: incomplete tour`);if(t.steps.length<8||t.steps.length>12)errors.push(`${t.id}: tour must have 8–12 stops`);for(const s of t.steps){if(!ids.has(s.conceptId))errors.push(`${t.id}: missing stop ${s.conceptId}`);if(!s.narration||s.narration.trim().length<30)errors.push(`${t.id}: missing narration`);}}

 if(!atlas.tours.length)errors.push('Atlas must include at least one journey');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(atlas.reviewedAt))errors.push('Missing content review date');
 return errors;
}

export function validateReleaseCoverage(atlas:Atlas){
 const errors:string[]=[];
 if(atlas.concepts.length!==573)errors.push('Edition 2.1 must contain exactly 573 complete concepts');
 if(atlas.tours.length!==10)errors.push('Edition 2.1 must contain exactly 10 journeys');
 for(const branch of branches)if(!atlas.concepts.some(c=>c.branchId===branch.id))errors.push(`Expanded edition: empty branch ${branch.id}`);
 return errors;
}
