import {atlas as englishAtlas} from '../data/atlas';
import {indexGraph,searchConcepts} from '../graph';
import type {Atlas,Concept,Contributor,Relationship,Discipline} from '../types';
import {englishTaxonomy,chineseTaxonomy} from './taxonomy';
import type {Locale} from './language';
import {translateFormula} from './formulas';
import foundations from '../data/zh-CN/foundations.json';
import physical from '../data/zh-CN/physical.json';
import lifeEarth from '../data/zh-CN/life-earth.json';
import spaceComputing from '../data/zh-CN/space-computing.json';
import expansionSystems from '../data/zh-CN/expansion-systems.json';
import expansionPhysical from '../data/zh-CN/expansion-physical.json';
import expansionLife from '../data/zh-CN/expansion-life.json';
import tours from '../data/zh-CN/tours.json';

export interface ConceptTranslation {
 sourceDigest:string;title:string;aliases:string[];tags:string[];summary:string;problem:string;development:string;limitations:string;
 date:{label:string;note:string};contributors:Contributor[];example?:string;historicalSetting?:string;
 representation?:{explanation:string;expression?:string};
}
export interface ContentTranslation {
 concepts:Record<string,ConceptTranslation>;
 relationships:Record<string,{sourceDigest:string;explanation:string}>;
}
export interface TourTranslation {sourceDigest:string;title:string;subtitle:string;steps:string[]}
export const translationParts:ContentTranslation[]=[foundations,physical,lifeEarth,spaceComputing,expansionSystems,expansionPhysical,expansionLife];
export const conceptTranslations=Object.assign({},...translationParts.map(p=>p.concepts)) as Record<string,ConceptTranslation>;
export const relationshipTranslations=Object.assign({},...translationParts.map(p=>p.relationships)) as ContentTranslation['relationships'];
export const tourTranslations:Record<string,TourTranslation>=tours;

export function translateConcept(c:Concept):Concept {
 const t=conceptTranslations[c.id];if(!t)return c;
 return {...c,title:t.title,aliases:t.aliases,tags:t.tags,summary:t.summary,problem:t.problem,development:t.development,limitations:t.limitations,
  date:{...c.date,...t.date},contributors:t.contributors.map((person,i)=>({...person,name:person.name===c.contributors[i]?.name?person.name:`${person.name}（${c.contributors[i]?.name}）`})),
  ...(c.example!==undefined?{example:t.example}:{}),...(c.historicalSetting!==undefined?{historicalSetting:t.historicalSetting}:{}),
  ...(c.representation?{representation:{...c.representation,...t.representation,...(c.representation.kind==='formula'?{expression:translateFormula(c.id,c.representation.expression)}:{})}}:{})};
}
export const chineseAtlas:Atlas={...englishAtlas,concepts:englishAtlas.concepts.map(translateConcept),
 relationships:englishAtlas.relationships.map(edge=>({...edge,explanation:relationshipTranslations[edge.id]?.explanation??edge.explanation})),
 tours:englishAtlas.tours.map(tour=>{const t=tourTranslations[tour.id];return t?{...tour,title:t.title,subtitle:t.subtitle,steps:tour.steps.map((step,i)=>({...step,narration:t.steps[i]}))}:tour;})};

// Canonical graph traversal and ranking are shared by both languages.
const canonicalIndex=indexGraph(englishAtlas);
export const englishConceptTitle=(id:string)=>canonicalIndex.byId.get(id)?.title??id;
function presentation(atlas:Atlas,taxonomy:typeof englishTaxonomy){
 const byId=new Map(atlas.concepts.map(c=>[c.id,c])),edgeIndex=new Map(atlas.relationships.map(e=>[e.id,e]));
 const mapEdges=(map:Map<string,Relationship[]>)=>new Map([...map].map(([id,edges])=>[id,edges.map(e=>edgeIndex.get(e.id)!)]));
 const index={...canonicalIndex,byId,incoming:mapEdges(canonicalIndex.incoming),outgoing:mapEdges(canonicalIndex.outgoing),pillars:canonicalIndex.pillars.map(c=>byId.get(c.id)!)};
 const branchIndex=new Map(taxonomy.branches.map(b=>[b.id,b]));
 return {atlas,index,edgeIndex,...taxonomy,branchIndex,groupLabel:(id:string)=>branchIndex.get(id)?.label??taxonomy.disciplines[id as Discipline]?.label??id};
}
export const presentations={en:presentation(englishAtlas,englishTaxonomy),'zh-CN':presentation(chineseAtlas,chineseTaxonomy)};
// Both alphabets remain searchable regardless of the presentation language.
const searchable=englishAtlas.concepts.map((c,i)=>({...c,aliases:[...c.aliases,chineseAtlas.concepts[i].title,...chineseAtlas.concepts[i].aliases],contributors:[...c.contributors,...chineseAtlas.concepts[i].contributors]}));
export function searchLocalizedConcepts(query:string,locale:Locale){
 const presentation=presentations[locale];
 const q=query.trim().toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
 const prefix=(id:string)=>[canonicalIndex.byId.get(id)!.title,presentations['zh-CN'].index.byId.get(id)!.title].some(title=>title.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').startsWith(q));
 return searchConcepts(searchable,query).sort((a,b)=>Number(prefix(b.id))-Number(prefix(a.id))||a.date.year-b.date.year).map(c=>presentation.index.byId.get(c.id)!);
}
