import test from 'node:test';
import assert from 'node:assert/strict';
import {atlas} from '../src/data/atlas';
import {defaultState,parseState,serializeState} from '../src/state';
import {preferredLocale,readPreferredLocale,savePreferredLocale,isComposing} from '../src/i18n/language';
import {chineseAtlas,presentations,searchLocalizedConcepts,translationParts,tourTranslations} from '../src/i18n/content';
import {validateTranslations} from '../src/i18n/validate';
import {translate} from '../src/i18n/messages';
import {translateFormula} from '../src/i18n/formulas';
import {formatPeriod} from '../src/i18n/LocaleProvider';
import {chineseDateLabel} from '../src/i18n/dates';
import {layoutGraph,buildBundles,filterGraph,periodFor} from '../src/graph';
import {cameraIntent} from '../src/interaction';

test('URL, saved choice, and browser preferences resolve in priority order',()=>{
 assert.equal(preferredLocale('en',['zh-CN']),'en');
 assert.equal(preferredLocale('zh-CN',['en-US']),'zh-CN');
 for(const variant of ['zh','zh-CN','zh-Hans','zh-TW','zh-Hant-HK'])assert.equal(preferredLocale(null,[variant]),'zh-CN');
 assert.equal(preferredLocale(null,['en-CA','zh-CN']),'en');
 assert.equal(preferredLocale(null,['fr-CA','zh-CN']),'zh-CN');
 assert.equal(preferredLocale('bad',['fr']),'en');
 assert.equal(parseState('#lang=en','zh-CN').locale,'en');
 assert.equal(parseState('#lang=zh-CN','en').locale,'zh-CN');
 assert.equal(parseState('#lang=invalid','zh-CN').locale,'zh-CN');
 assert.equal(parseState('#concept=calculus','zh-CN').locale,'zh-CN');
});

test('unavailable preference storage does not prevent language selection',t=>{
 const oldWindow=Object.getOwnPropertyDescriptor(globalThis,'window'),oldNavigator=Object.getOwnPropertyDescriptor(globalThis,'navigator');
 Object.defineProperty(globalThis,'window',{configurable:true,value:{get localStorage(){throw new Error('Blocked storage');}}});
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{languages:['zh-CN'],language:'zh-CN'}});
 t.after(()=>{for(const [key,value] of [['window',oldWindow],['navigator',oldNavigator]] as const){if(value)Object.defineProperty(globalThis,key,value);else Reflect.deleteProperty(globalThis,key);}});
 assert.equal(readPreferredLocale(),'zh-CN');assert.doesNotThrow(()=>savePreferredLocale('en'));
});

test('language changes round-trip every view field and are not camera requests',()=>{
 const original={...defaultState,concept:'general-relativity',tour:'geometry-to-spacetime',step:4,view:'list' as const,trace:'ancestors' as const,display:'formal' as const,connections:'all' as const,branches:['physics-fields'],disciplines:['physics' as const],standing:'established' as const,era:'modern',relations:[]};
 for(const locale of ['en','zh-CN'] as const){
  const next={...original,locale};const hash=serializeState(next);
  assert.match(hash,new RegExp(`lang=${locale}`));assert.deepEqual(parseState(hash),next);
 }
 const before={...original,view:'tower' as const};assert.equal(cameraIntent(before,{...before,locale:'zh-CN'} as typeof before),null);
 assert.equal(parseState(serializeState(defaultState),'zh-CN').locale,'en','shared English views override a Chinese preference');
});

test('bilingual search matches scientific names, contributors, aliases, and diacritics',()=>{
 for(const locale of ['en','zh-CN'] as const){
  for(const query of ['爱因斯坦','Einstein','广义相对论','General relativity'])assert(searchLocalizedConcepts(query,locale).some(c=>c.id==='general-relativity'),query);
  assert(searchLocalizedConcepts('Godel',locale).some(c=>c.id==='incompleteness'));
  assert(searchLocalizedConcepts('测度',locale).some(c=>c.id==='measure-theory'));
  assert.equal(searchLocalizedConcepts('没有这个概念xyz',locale).length,0);assert.equal(searchLocalizedConcepts('   ',locale).length,0);
 }
 assert.equal(searchLocalizedConcepts('广义相对论','en')[0].title,'General relativity');
 assert.equal(searchLocalizedConcepts('General relativity','zh-CN')[0].title,'广义相对论');
});

test('Chinese IME composition is recognized including the legacy key event',()=>{
 assert(isComposing({isComposing:true,keyCode:13}));assert(isComposing({isComposing:false,keyCode:229}));
 assert(!isComposing({isComposing:false,keyCode:13}));assert(!isComposing({keyCode:27}));
});

test('the complete Chinese edition passes coverage and source freshness checks',()=>{
 assert.deepEqual(validateTranslations(),[]);
 assert.equal(chineseAtlas.concepts.length,450);assert.equal(chineseAtlas.relationships.length,824);assert.equal(chineseAtlas.tours.length,6);
});

test('translation validation catches omissions, stale source, misalignment, and unsafe structural additions',()=>{
 const parts=structuredClone(translationParts),tours=structuredClone(tourTranslations),source=structuredClone(atlas);
 delete parts[0].concepts.counting;
 parts[0].concepts['tally-marks'].contributors=[];
 parts[0].concepts.measurement.summary='';
 delete parts.find(p=>p.concepts['cell-theory'])!.concepts['cell-theory'].representation!.expression;
 (parts[0].concepts.arithmetic as unknown as Record<string,unknown>).id='changed-id';
 source.concepts.find(c=>c.id==='geometry')!.summary+=' Updated evidence.';
 tours[source.tours[0].id].steps.pop();
 const errors=validateTranslations(source,parts,tours);
 for(const fragment of ['missing counting','tally-marks: contributor alignment','measurement.summary: missing','cell-theory.representation: missing expression','arithmetic: unexpected id','geometry: stale','journey step alignment'])assert(errors.some(e=>e.includes(fragment)),fragment);
});

test('localization preserves structure, citations, chronology, geometry, bundles, and pillar ranking',()=>{
 const english=layoutGraph(atlas.concepts),chinese=layoutGraph(chineseAtlas.concepts);
 assert.deepEqual(english,chinese);
 const strip=(c:typeof atlas.concepts[number])=>({id:c.id,discipline:c.discipline,branchId:c.branchId,relatedBranchIds:c.relatedBranchIds,kind:c.kind,year:c.date.year,precision:c.date.precision,standing:c.standing,sourceIds:c.sourceIds,claimSources:c.claimSources,representation:c.representation&&{kind:c.representation.kind,sourceIds:c.representation.sourceIds}});
 assert.deepEqual(atlas.concepts.map(strip),chineseAtlas.concepts.map(strip));
 assert.deepEqual(chineseAtlas.sources,atlas.sources);
 assert.deepEqual(chineseAtlas.relationships.map(({explanation,...e})=>e),atlas.relationships.map(({explanation,...e})=>e));
 assert.deepEqual(buildBundles(chineseAtlas.concepts,chineseAtlas.relationships),buildBundles(atlas.concepts,atlas.relationships));
 assert.deepEqual(presentations.en.index.pillars.map(c=>c.id),presentations['zh-CN'].index.pillars.map(c=>c.id));
 const filters={...defaultState,branches:['physics-fields'],relations:['foundation' as const]};
 const a=filterGraph(atlas.concepts,atlas.relationships,filters,'general-relativity','ancestors',presentations.en.index);
 const b=filterGraph(chineseAtlas.concepts,chineseAtlas.relationships,filters,'general-relativity','ancestors',presentations['zh-CN'].index);
 assert.deepEqual(a.visible,b.visible);assert.deepEqual(a.highlight,b.highlight);assert.deepEqual(a.edges.map(e=>e.id),b.edges.map(e=>e.id));
});

test('formulas retain mathematical notation while explanatory words and definitions are localized',()=>{
 for(const c of atlas.concepts){if(c.representation?.kind==='formula')assert.equal(presentations['zh-CN'].index.byId.get(c.id)!.representation!.expression,translateFormula(c.id,c.representation.expression));}
 for(const id of ['special-relativity','general-relativity','transformers','functional-programming','fast-fourier-transform','limits']){
  assert.equal(presentations['zh-CN'].index.byId.get(id)!.representation!.expression,presentations.en.index.byId.get(id)!.representation!.expression,id);
 }
 assert.equal(translateFormula('photosynthesis','6 CO₂ + 6 H₂O + light → C₆H₁₂O₆ + 6 O₂'),'6 CO₂ + 6 H₂O + 光能 → C₆H₁₂O₆ + 6 O₂');
 assert.match(presentations['zh-CN'].index.byId.get('cell-theory')!.representation!.expression,/细胞/);
});

test('Chinese date floors retain BCE and CE boundaries without year zero',()=>{
 assert.equal(formatPeriod('zh-CN',periodFor(-30000)),'公元前5000年以前');
 assert.equal(formatPeriod('zh-CN',periodFor(1)),'公元1年—公元99年');
 assert(!formatPeriod('zh-CN',periodFor(-1)).includes('公元0年'));
 assert.equal(formatPeriod('en',periodFor(1)),periodFor(1).label);
});

test('Chinese authored dates preserve approximation, era, and historical range',()=>{
 for(const [source,expected] of [['1684','1684年'],['1995 CE','公元1995年'],['c. 300 BCE','约公元前300年'],['c. 200 BCE – 200 CE','约公元前200年—公元200年'],['1830s–1840s','19世纪30—40年代'],['2015 detection; 2016 announcement','2015年探测到；2016年公布']])assert.equal(chineseDateLabel(source),expected);
 assert.equal(chineseDateLabel('not an authored date'),undefined);
 const parts=structuredClone(translationParts);
 parts[0].concepts.counting.date.label='公元2026年';
 assert(validateTranslations(atlas,parts).some(e=>e.includes('counting.date.label: historical date')));
});

test('interface messages substitute counts and labels without leaking placeholders',()=>{
 assert.equal(translate('zh-CN','{count} ideas found',{count:12}),'找到12个概念');
 assert.equal(translate('en','{count} ideas found',{count:1}),'1 idea found');
 assert.equal(translate('zh-CN','Explore {branch} in {era}',{branch:'数学',era:'现代科学'}),'探索现代科学的数学');
});
