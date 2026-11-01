import test from 'node:test';
import assert from 'node:assert/strict';
import { atlas } from '../src/data/atlas';
import { validateAtlas } from '../src/validate';
import { indexGraph,layoutGraph,filterGraph,searchConcepts,NODE_WIDTH,NODE_HEIGHT,COLUMN_GAP } from '../src/graph';
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
 const state={...defaultState,concept:'general-relativity',tour:'geometry-to-spacetime',step:5,view:'list' as const,display:'formal' as const,trace:'ancestors' as const,disciplines:['physics' as const],relations:[]};assert.deepEqual(parseState(serializeState(state)),state);
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

test('each chronological row and era boundary is horizontally centered',()=>{
 const layout=layoutGraph(atlas.concepts);
 for(const row of layout.rows){
  const xs=row.ids.map(id=>layout.positions.get(id)!.x);
  assert.equal(Math.min(...xs)+Math.max(...xs)+NODE_WIDTH,0);
  assert(row.ids.every(id=>layout.positions.get(id)!.y===row.y));
 }
 for(const band of layout.bands)assert.equal(band.left+band.width/2,0);
 assert(new Set(layout.bands.map(b=>b.width)).size>1);
});

test('crowded years expand horizontally without wrapping or overlapping',()=>{
 const concepts=Array.from({length:16},(_,i)=>({...atlas.concepts[0],id:`wide-${i}`,date:{...atlas.concepts[0].date,year:2001}}));
 const layout=layoutGraph(concepts),row=layout.rows[0];
 assert.equal(row.width,16*NODE_WIDTH+15*COLUMN_GAP);
 assert(row.width>9*246);
 assert.equal(new Set([...layout.positions.values()].map(p=>p.y)).size,1);
 for(let i=1;i<row.ids.length;i++)assert.equal(layout.positions.get(row.ids[i])!.x-layout.positions.get(row.ids[i-1])!.x,NODE_WIDTH+COLUMN_GAP);
 const rows=layoutGraph(atlas.concepts).rows;
 for(let i=1;i<rows.length;i++)assert(rows[i-1].y-rows[i].y>=NODE_HEIGHT);
});

test('formal content has citations and explanations, with safe language fallback',()=>{
 const represented=atlas.concepts.filter(c=>c.representation);
 assert(represented.length>=90);
 assert(represented.some(c=>c.representation?.kind==='definition'));
 assert(represented.some(c=>c.representation?.kind==='formula'));
 assert.equal(parseState('#display=unknown').display,'language');
 assert.equal(parseState('#concept=counting').display,'language');
 const bad=structuredClone(atlas);bad.concepts.find(c=>c.representation)!.representation!.sourceIds=[];
 assert(validateAtlas(bad).some(e=>e.includes('representation: no citations')));
});
