import {createHash} from 'node:crypto';
import {atlas} from '../data/atlas';
import type {Atlas} from '../types';
import {branches} from '../branches';
import {translationParts,tourTranslations,type ContentTranslation,type TourTranslation} from './content';
import {branchNames} from './taxonomy';
import {messages} from './messages';
import {chineseDateLabel} from './dates';
import {symbolicDefinitions} from './formulas';

export const sourceDigest=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function validateTranslations(base:Atlas=atlas,parts:ContentTranslation[]=translationParts,tours:Record<string,TourTranslation>=tourTranslations,ui:Record<string,string>=messages['zh-CN']){
 const errors:string[]=[];
 const concepts=Object.assign({},...parts.map(p=>p.concepts)) as ContentTranslation['concepts'];
 const relationships=Object.assign({},...parts.map(p=>p.relationships)) as ContentTranslation['relationships'];
 const keys=(actual:string[],expected:string[],where:string)=>{
  if(new Set(actual).size!==actual.length)errors.push(`${where}: duplicate IDs`);
  for(const id of expected)if(!actual.includes(id))errors.push(`${where}: missing ${id}`);
  for(const id of actual)if(!expected.includes(id))errors.push(`${where}: unexpected ${id}`);
 };
 const text=(value:unknown,where:string,chinese=true)=>{
  if(typeof value!=='string'||!value.trim()){errors.push(`${where}: missing translation`);return;}
  if(/ZXQ\s*\d+\s*QXZ|\uFFFD/.test(value))errors.push(`${where}: damaged translation`);
  if(chinese&&!/[\u3400-\u9fff]/.test(value))errors.push(`${where}: Chinese prose required`);
 };
 keys(parts.flatMap(p=>Object.keys(p.concepts)),base.concepts.map(c=>c.id),'Chinese concepts');
 keys(parts.flatMap(p=>Object.keys(p.relationships)),base.relationships.map(e=>e.id),'Chinese relationships');
 keys(Object.keys(tours),base.tours.map(t=>t.id),'Chinese journeys');
 keys(Object.keys(branchNames),branches.map(b=>b.id),'Chinese branches');
 for(const c of base.concepts){
  const t=concepts[c.id];if(!t)continue;
  if(t.sourceDigest!==sourceDigest(c))errors.push(`${c.id}: stale Chinese translation`);
  keys(Object.keys(t),['sourceDigest','title','aliases','tags','summary','problem','development','limitations','date','contributors',...(c.example!==undefined?['example']:[]),...(c.historicalSetting!==undefined?['historicalSetting']:[]),...(c.representation?['representation']:[])],c.id);
  for(const field of ['title','summary','problem','development','limitations'] as const)text(t[field],`${c.id}.${field}`);
  for(const field of ['example','historicalSetting'] as const)if(c[field]!==undefined)text(t[field],`${c.id}.${field}`);
  for(const field of ['aliases','tags'] as const){
   if(!Array.isArray(t[field])||t[field].length!==c[field].length)errors.push(`${c.id}.${field}: alignment mismatch`);
   else t[field].forEach((value,i)=>text(value,`${c.id}.${field}[${i}]`,false));
  }
  if(!t.date){errors.push(`${c.id}: missing translated date`);}else{
   keys(Object.keys(t.date),['label','note'],`${c.id}.date`);
   text(t.date.label,`${c.id}.date.label`,false);
   const expected=chineseDateLabel(c.date.label);
   if(!expected||t.date.label!==expected)errors.push(`${c.id}.date.label: historical date translation mismatch`);
   if(c.date.note)text(t.date.note,`${c.id}.date.note`);
   else if(t.date.note!=='')errors.push(`${c.id}.date.note: added content`);
  }
  if(!Array.isArray(t.contributors)||t.contributors.length!==c.contributors.length)errors.push(`${c.id}: contributor alignment mismatch`);
  else t.contributors.forEach((person,i)=>{keys(Object.keys(person),['name','role'],`${c.id}.contributors[${i}]`);text(person.name,`${c.id}.contributors[${i}].name`,false);text(person.role,`${c.id}.contributors[${i}].role`);});
  if(c.representation){
   if(!t.representation){errors.push(`${c.id}: missing translated representation`);continue;}
   text(t.representation.explanation,`${c.id}.representation.explanation`);
   const proseDefinition=c.representation.kind==='definition'&&!symbolicDefinitions.has(c.id);
   keys(Object.keys(t.representation),['explanation',...(proseDefinition?['expression']:[])],`${c.id}.representation`);
   if(proseDefinition)text(t.representation.expression,`${c.id}.representation.expression`);
   if(t.representation.expression!==undefined){
    if(c.representation.kind==='formula')errors.push(`${c.id}: formula must use reviewed word replacements, not an overlay`);
    text(t.representation.expression,`${c.id}.representation.expression`);
   }
  }
 }
 for(const e of base.relationships){const t=relationships[e.id];if(!t)continue;
  if(t.sourceDigest!==sourceDigest(e))errors.push(`${e.id}: stale Chinese translation`);
  keys(Object.keys(t),['sourceDigest','explanation'],e.id);text(t.explanation,`${e.id}.explanation`);
 }
 for(const tour of base.tours){const t=tours[tour.id];if(!t)continue;
  if(t.sourceDigest!==sourceDigest(tour))errors.push(`${tour.id}: stale Chinese journey`);
  keys(Object.keys(t),['sourceDigest','title','subtitle','steps'],tour.id);text(t.title,`${tour.id}.title`);text(t.subtitle,`${tour.id}.subtitle`);
  if(!Array.isArray(t.steps)||t.steps.length!==tour.steps.length)errors.push(`${tour.id}: journey step alignment mismatch`);
  else t.steps.forEach((step,i)=>{text(step,`${tour.id}.steps[${i}]`);if([...step].length<30)errors.push(`${tour.id}.steps[${i}]: narration too short`);});
 }
 keys(Object.keys(ui),Object.keys(messages.en),'Chinese interface');
 const placeholders=(s:string)=>[...s.matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort().join(',');
 for(const [key,value] of Object.entries(messages.en)){
  text(ui[key],`UI: ${key}`,!['Aa','⌘ K'].includes(key));
  if(typeof ui[key]==='string'&&placeholders(ui[key])!==placeholders(value))errors.push(`UI: ${key}: interpolation mismatch`);
 }
 return errors;
}
