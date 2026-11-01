import test from 'node:test';
import assert from 'node:assert/strict';
import { atlas } from '../src/data/atlas';
import { validateAtlas } from '../src/validate';
import { indexGraph,layoutGraph,filterGraph,searchConcepts } from '../src/graph';
import { defaultState,parseState,serializeState } from '../src/state';
const index=indexGraph(atlas);
test('full collection satisfies content, citation, chronology, and tour contracts',()=>assert.deepEqual(validateAtlas(atlas),[]));
test('multi-parent theory retains its mathematical and physical ancestry',()=>{
 const ancestors=index.walk('general-relativity','incoming');assert(ancestors.has('tensor-calculus'));assert(ancestors.has('calculus'));assert(ancestors.has('geometry'));assert(!ancestors.has('general-relativity'));
});
test('diamond-shaped ancestry counts a descendant only once',()=>{
 const demo=indexGraph({concepts:['a','b','c','d'].map(id=>({...atlas.concepts[0],id})),relationships:[['a','b'],['a','c'],['b','d'],['c','d']].map(([source,target])=>({...atlas.relationships[0],source,target,id:`${source}-${target}`}))});assert.equal(demo.walk('a','outgoing').size,3);assert.equal(demo.direct('a'),2);
});
test('trace keeps filtered-out ancestors visible as context',()=>{
 const result=filterGraph(atlas.concepts,atlas.relationships,{...defaultState,disciplines:['physics']},'general-relativity','ancestors',index);
 assert(result.visible.has('tensor-calculus'));assert(!result.matching.has('tensor-calculus'));assert(result.highlight.has('tensor-calculus'));
});
test('relationship filters control trace traversal and visible edges',()=>{
 const result=filterGraph(atlas.concepts,atlas.relationships,{...defaultState,relations:[]},'general-relativity','ancestors',index);assert.equal(result.edges.length,0);assert.deepEqual([...result.highlight],['general-relativity']);
});
test('search finds aliases, names, and diacritics; unmatched terms stay empty',()=>{
 assert(searchConcepts(atlas.concepts,'Einstein').some(c=>c.id==='general-relativity'));assert(searchConcepts(atlas.concepts,'Brahmagupta').some(c=>c.id==='zero-number'));assert(searchConcepts(atlas.concepts,'Godel').some(c=>c.id==='incompleteness'));assert.equal(searchConcepts(atlas.concepts,'zzzz-no-such-concept').length,0);
});
test('layout is deterministic and chronological; filtering cannot reposition a node',()=>{
 const a=layoutGraph(atlas.concepts),b=layoutGraph([...atlas.concepts].reverse());for(const c of atlas.concepts)assert.deepEqual(a.positions.get(c.id),b.positions.get(c.id));for(const e of atlas.relationships){const from=a.positions.get(e.source)!,to=a.positions.get(e.target)!;if(index.byId.get(e.source)!.date.year<index.byId.get(e.target)!.date.year)assert(from.y>to.y);}
});
test('shareable state round trips including disabled links and tour step',()=>{
 const state={...defaultState,concept:'general-relativity',tour:'geometry-to-spacetime',step:5,view:'list' as const,trace:'ancestors' as const,disciplines:['physics' as const],relations:[]};assert.deepEqual(parseState(serializeState(state)),state);
});
test('invalid URL filters and negative steps are normalized',()=>{
 const s=parseState('#step=-10&fields=unknown,physics&standing=invalid&view=wrong&era=invalid&trace=wrong');assert.equal(s.step,0);assert.deepEqual(s.disciplines,['physics']);assert.equal(s.standing,'');assert.equal(s.view,'tower');assert.equal(s.era,'');assert.equal(s.trace,'neighbors');
});
test('validator detects missing citations, reversed dates, dangling IDs and cycles',()=>{
 const bad=structuredClone(atlas);bad.concepts[0].sourceIds=[];bad.relationships.push({...bad.relationships[0],id:'broken',source:'missing-id'});bad.relationships.push({...bad.relationships[0],id:'backwards',source:'general-relativity',target:'calculus'});const errors=validateAtlas(bad);assert(errors.some(e=>e.includes('no citations')));assert(errors.some(e=>e.includes('missing endpoint')));assert(errors.some(e=>e.includes('chronology reverses')));assert(errors.some(e=>e.includes('Cycle')));
});
test('pillars have enough supported children and are sorted consistently',()=>{
 assert(index.pillars.length>0);for(const c of index.pillars)assert(index.direct(c.id)>=5);for(let i=1;i<index.pillars.length;i++)assert(index.direct(index.pillars[i-1].id)>=index.direct(index.pillars[i].id));
});
test('all guided journeys refer to completed concepts with substantive narration',()=>{
 for(const t of atlas.tours){assert(t.steps.length>=8&&t.steps.length<=12);for(const step of t.steps){assert(index.byId.has(step.conceptId));assert(step.narration.split(/\s+/).length>=15);}}
});
