import test from 'node:test';
import assert from 'node:assert/strict';
import { atlas } from '../src/data/atlas';
import {assertCleanRoute} from './routeAssertions';
import {finishRoute} from '../src/graph';
import { validateAtlas,validateReleaseCoverage } from '../src/validate';
import { indexGraph,layoutGraph,filterGraph,searchConcepts,NODE_WIDTH,NODE_HEIGHT,COLUMN_GAP,periodFor,routeRelationships,buildBundles,visibleBundles,eraBandAt } from '../src/graph';
import { defaultState,parseState,serializeState } from '../src/state';
import { branches,sectionOrder } from '../src/branches';
const index=indexGraph(atlas);
test('full collection satisfies content, citation, chronology, and tour contracts',()=>assert.deepEqual([...validateAtlas(atlas),...validateReleaseCoverage(atlas)],[]));
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
 const a=layoutGraph(atlas.concepts),b=layoutGraph([...atlas.concepts].reverse());for(const c of atlas.concepts)assert.deepEqual(a.positions.get(c.id),b.positions.get(c.id));for(const e of atlas.relationships){const from=a.positions.get(e.source)!,to=a.positions.get(e.target)!;if(periodFor(index.byId.get(e.source)!.date.year).id!==periodFor(index.byId.get(e.target)!.date.year).id)assert(from.y>to.y);else assert.equal(from.y,to.y);}
});
test('shareable state round trips including disabled links and tour step',()=>{
 const state={...defaultState,concept:'general-relativity',tour:'geometry-to-spacetime',step:5,view:'list' as const,display:'formal' as const,trace:'ancestors' as const,disciplines:['physics' as const],branches:['physics-fields'],connections:'focus' as const,relations:[]};assert.deepEqual(parseState(serializeState(state)),state);
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

test('era bounds and occupied branch cells are centered, with section containment',()=>{
 const layout=layoutGraph(atlas.concepts);
 for(const band of layout.bands)assert.equal(band.left+band.width/2,0);
 for(const region of layout.regions){
  const section=layout.sections.find(s=>s.id===region.discipline&&s.eraId===region.eraId)!;
  assert(region.left>=section.left&&region.left+region.width<=section.left+section.width);
  for(const row of layout.rows.filter(r=>r.eraId===region.eraId)){
   const ids=row.ids.filter(id=>index.byId.get(id)!.branchId===region.id);if(!ids.length)continue;
   const xs=ids.map(id=>layout.positions.get(id)!.x);
   assert.equal((Math.min(...xs)+Math.max(...xs)+NODE_WIDTH)/2,region.left+region.width/2);
   for(const x of xs)assert(x>=region.left&&x+NODE_WIDTH<=region.left+region.width);
  }
 }
 assert(new Set(layout.bands.map(b=>b.width)).size>1);
});
test('crowded periods expand horizontally without wrapping or overlapping',()=>{
 const concepts=Array.from({length:16},(_,i)=>({...atlas.concepts[0],branchId:'math-number',discipline:'mathematics' as const,id:`wide-${i}`,date:{...atlas.concepts[0].date,year:2001+i%4}}));
 const layout=layoutGraph(concepts),row=layout.rows[0];
 assert(row.width>=16*NODE_WIDTH+15*COLUMN_GAP);assert(row.width>9*246);
 assert.equal(new Set([...layout.positions.values()].map(p=>p.y)).size,1);
 const xs=[...layout.positions.values()].map(p=>p.x).sort((a,b)=>a-b);
 for(let i=1;i<xs.length;i++)assert.equal(xs[i]-xs[i-1],NODE_WIDTH+COLUMN_GAP);
 const rows=layoutGraph(atlas.concepts).rows;
 for(let i=1;i<rows.length;i++)assert(rows[i-1].y-rows[i].y>=NODE_HEIGHT);
});
test('nearby dates in different branches reserve separate horizontal regions throughout the era',()=>{
 const entries=[['a',1901,'physics-mechanics','physics'],['b',1903,'chemistry-structure','chemistry'],['c',1908,'physics-mechanics','physics'],['d',1911,'chemistry-structure','chemistry']] as const;
 const concepts=entries.map(([id,year,branchId,discipline])=>({...atlas.concepts[0],id,branchId,discipline,date:{...atlas.concepts[0].date,year}}));
 const layout=layoutGraph(concepts);assert.equal(layout.positions.get('a')!.y,layout.positions.get('b')!.y);assert(layout.positions.get('a')!.x+NODE_WIDTH<layout.positions.get('b')!.x);
 assert.equal(layout.positions.get('a')!.x,layout.positions.get('c')!.x);assert.equal(layout.positions.get('b')!.x,layout.positions.get('d')!.x);assert(layout.positions.get('c')!.y>layout.positions.get('d')!.y);
});
test('period conventions split at era boundaries and skip a year-zero label',()=>{
 assert.equal(periodFor(-30000).id,periodFor(-5001).id);assert.notEqual(periodFor(-5001).id,periodFor(-5000).id);
 assert.notEqual(periodFor(-501).id,periodFor(-500).id);assert.equal(periodFor(1901).id,periodFor(1904).id);assert.notEqual(periodFor(1904).id,periodFor(1905).id);assert.equal(periodFor(1).label,'1 CE – 99 CE');
});
test('combined branch, discipline, era, and standing filters preserve traced context',()=>{
 const result=filterGraph(atlas.concepts,atlas.relationships,{...defaultState,branches:['physics-fields'],disciplines:['physics'],era:'modern',standing:'established'},'general-relativity','ancestors',index);
 assert(result.visible.has('tensor-calculus'));assert(!result.matching.has('tensor-calculus'));
 for(const id of result.matching){const c=index.byId.get(id)!;assert.equal(c.branchId,'physics-fields');assert.equal(c.standing,'established');assert(c.date.year>=1900&&c.date.year<1950);}
 const empty=filterGraph(atlas.concepts,atlas.relationships,{...defaultState,branches:['physics-fields'],disciplines:['medicine']},'','neighbors',index);assert.equal(empty.matching.size,0);
});
test('bundle membership is distinct, filter-aware, and separated by type and evidence',()=>{
 const bundles=buildBundles(atlas.concepts,atlas.relationships);
 for(const level of ['section','branch'] as const){
  const visible=visibleBundles(bundles,atlas.relationships,level),members=visible.flatMap(b=>b.memberIds);assert.equal(members.length,atlas.relationships.length);assert.equal(new Set(members).size,members.length);
  for(const b of visible)for(const id of b.memberIds){const e=atlas.relationships.find(e=>e.id===id)!;assert.equal(e.type,b.type);assert.equal(e.evidence,b.evidence);}
  const filtered=filterGraph(atlas.concepts,atlas.relationships,{...defaultState,disciplines:['physics'],relations:['foundation','enables']},'general-relativity','ancestors',index);
  const individual=new Set(filtered.edges.filter(e=>e.source==='general-relativity'||e.target==='general-relativity').map(e=>e.id));
  const displayed=visibleBundles(bundles,filtered.edges,level,individual);
  assert.equal(displayed.reduce((n,b)=>n+b.memberIds.length,0)+individual.size,filtered.edges.length);
  for(const b of displayed)assert.equal(b.routeId,bundles.find(v=>v.id===b.id)!.routeId);
 }
 const before=index.direct('calculus');buildBundles(atlas.concepts,atlas.relationships);assert.equal(index.direct('calculus'),before);
});
function assertClearRoutes(concepts:typeof atlas.concepts,relationships:typeof atlas.relationships){
 const layout=layoutGraph(concepts),routes=routeRelationships(layout,relationships);
 for(const edge of relationships){const route=routes.get(edge.id)!;assert(route?.path.startsWith('M '));
  assertCleanRoute(route.points,edge.id);
  for(let i=1;i<route.points.length;i++){const a=route.points[i-1],b=route.points[i];assert(a.x===b.x||a.y===b.y);
   for(const c of concepts){if(c.id===edge.source||c.id===edge.target)continue;const p=layout.positions.get(c.id)!;
    const crosses=a.x===b.x?a.x>p.x&&a.x<p.x+NODE_WIDTH&&Math.max(a.y,b.y)>p.y&&Math.min(a.y,b.y)<p.y+NODE_HEIGHT:a.y>p.y&&a.y<p.y+NODE_HEIGHT&&Math.max(a.x,b.x)>p.x&&Math.min(a.x,b.x)<p.x+NODE_WIDTH;
    assert(!crosses,`${edge.id} route intersects ${c.id}`);
   }
  }
 }
 return routes;
}
test('all individual routes avoid unrelated cards, including changing era widths',()=>{assertClearRoutes(atlas.concepts,atlas.relationships);});
test('a clear elbow replaces a dogleg while obstacles keep the necessary detour',()=>{
 const points=[{x:0,y:100},{x:0,y:80},{x:25,y:80},{x:25,y:60},{x:75,y:60},{x:75,y:20}];
 assert.deepEqual(finishRoute(points,2,[]).points,[points[0],points[1],{x:75,y:80},points[5]]);
 const blocked=[{left:45,right:55,top:75,bottom:85},{left:-4,right:4,top:65,bottom:75}];
 assert.deepEqual(finishRoute(points,2,blocked).points,points);
});
test('the approach to diffusion models and adjacent-floor links do not overshoot their turns',()=>{
 const layout=layoutGraph(atlas.concepts),routes=routeRelationships(layout,atlas.relationships);
 const path=routes.get('deep-learning--diffusion-models')!.points;
 assert(path.every((p,i)=>i===0||p.y<=path[i-1].y));
 const floorIndex=new Map(layout.rows.map((row,i)=>[row.id,i]));
 const floorOf=(id:string)=>floorIndex.get(layout.nodeFloor.get(id)!)!;
 const adjacent=atlas.relationships.filter(e=>floorOf(e.target)-floorOf(e.source)===1);
 assert(adjacent.length>0);
 for(const e of adjacent)assert(routes.get(e.id)!.points.length<=4,e.id);
});
test('dense routing handles many parents, same-floor links, and long links deterministically',()=>{
 const concepts=Array.from({length:24},(_,i)=>({...atlas.concepts[0],id:`route-${i}`,discipline:i%2?'physics' as const:'mathematics' as const,branchId:i%2?'physics-fields':'math-analysis',date:{...atlas.concepts[0].date,year:i<12?1801:1901}}));
 const relationships=Array.from({length:23},(_,i)=>({...atlas.relationships[0],id:`route-edge-${i}`,source:`route-${i}`,target:'route-23'}));
 relationships.push({...atlas.relationships[0],id:'same-floor',source:'route-0',target:'route-1'});
 const a=assertClearRoutes(concepts,relationships),b=routeRelationships(layoutGraph([...concepts].reverse()),[...relationships].reverse());
 for(const [id,route] of a)assert.deepEqual(route,b.get(id));assert(new Set(relationships.filter(e=>e.target==='route-23').map(e=>a.get(e.id)!.points.at(-1)!.x)).size>10);
});
test('branch membership and release coverage are explicitly validated',()=>{
 assert.equal(sectionOrder.length,12);assert.equal(branches.length,43);
 const broken=structuredClone(atlas);broken.concepts[0].branchId='missing';broken.concepts[1].relatedBranchIds=['missing'];assert(validateAtlas(broken).some(e=>e.includes('invalid primary branch')));assert(validateAtlas(broken).some(e=>e.includes('invalid related branches')));assert(validateReleaseCoverage({...atlas,concepts:atlas.concepts.slice(0,100)}).length>0);
 assert.equal(parseState('#concept=calculus&display=formal').connections,'bundled');assert.deepEqual(parseState('#branches=unknown,physics-fields&connections=wrong').branches,['physics-fields']);
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

test('branch ruler chooses the containing era even near its earliest floor',()=>{
 const layout=layoutGraph(atlas.concepts);
 for(const row of layout.rows)assert.equal(eraBandAt(layout,row.y+NODE_HEIGHT/2).id,row.eraId);
 const firstModern=layout.rows.find(r=>r.eraId==='modern')!;assert.equal(eraBandAt(layout,firstModern.y+NODE_HEIGHT).id,'modern');
});
