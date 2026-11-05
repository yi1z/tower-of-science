import test from 'node:test';
import assert from 'node:assert/strict';
import {assertCleanRoute} from './routeAssertions';
import {placeEraTags,ERA_TAG_HEIGHT} from '../src/eraTags';
import {cameraIntent,dragViewport,pinchViewport,type CameraState} from '../src/interaction';
import {buildSummaryView,summaryBundles,summaryLevel,summaryRoute,fitPillarTitle,regionId} from '../src/overview';
import {atlas} from '../src/data/atlas';
import {layoutGraph,indexGraph,filterGraph,NODE_WIDTH,NODE_HEIGHT,routeInViewport} from '../src/graph';
import {defaultState} from '../src/state';
import {eraFor} from '../src/config';

const layout=layoutGraph(atlas.concepts),index=indexGraph(atlas),all=new Set(atlas.concepts.map(c=>c.id));
test('camera initializes from the link, but deselection and panel resizes preserve the viewport',()=>{
 const empty:CameraState={concept:'',era:'',view:'tower'};
 assert.deepEqual(cameraIntent(null,empty),{kind:'home'});
 const selected={...empty,concept:'general-relativity'};
 assert.deepEqual(cameraIntent(null,selected),{kind:'concept',id:'general-relativity'});
 assert.equal(cameraIntent(selected,empty),null);
 assert.equal(cameraIntent(selected,selected),null);
 assert.equal(cameraIntent(empty,{...empty,era:'modern'}),null);
});
test('history selecting a new concept centers it; index reading defers the navigation',()=>{
 const previous:CameraState={concept:'calculus',era:'',view:'tower'};
 assert.deepEqual(cameraIntent(previous,{...previous,concept:'general-relativity'}),{kind:'concept',id:'general-relativity'});
 assert.equal(cameraIntent(previous,{...previous,view:'list',concept:'general-relativity'}),null);
 assert.equal(cameraIntent(previous,{...previous,view:'tower'}),null);
});
test('edge gestures distinguish clicks from drags in screen pixels and preserve zoom',()=>{
 for(const zoom of [.02,.3,1.5]){
  const gesture={pointerId:1,startX:100,startY:200,viewport:{x:-530,y:1190,zoom},dragging:false};
  assert.equal(dragViewport(gesture,103,204),null);
  assert.deepEqual(dragViewport(gesture,106,200),{x:-524,y:1190,zoom});
  assert.deepEqual(dragViewport(gesture,98,197),{x:-532,y:1187,zoom});
  assert(gesture.dragging);
 }
});
test('overview levels have hysteresis on both boundaries',()=>{
 assert.equal(summaryLevel(.31),'branch');assert.equal(summaryLevel(.33,'branch'),'branch');
 assert.equal(summaryLevel(.36,'branch'),'cards');assert.equal(summaryLevel(.119,'branch'),'section');
 assert.equal(summaryLevel(.13,'section'),'section');assert.equal(summaryLevel(.14,'section'),'branch');
 assert.equal(summaryLevel(.4,'section'),'cards');
});
test('unselected summaries cover all visible concepts exactly once, within their branch and era',()=>{
 for(const level of ['section','branch'] as const){
  const view=buildSummaryView(atlas.concepts,layout,all,new Set(),level);
  assert.equal(view.endpoints.size,atlas.concepts.length);
  assert.equal(view.summaries.reduce((n,s)=>n+s.memberIds.length,0),atlas.concepts.length);
  for(const summary of view.summaries)for(const id of summary.memberIds){const c=index.byId.get(id)!;assert.equal(summary.eraId,eraFor(c.date.year).id);assert.equal(summary.groupId,level==='section'?c.discipline:c.branchId);}
 }
 assert.equal(buildSummaryView(atlas.concepts,layout,all,new Set(),'cards').summaries.length,0);
 assert.equal(buildSummaryView(atlas.concepts,layout,new Set(),new Set(),'branch').summaries.length,0);
});
test('filtered ancestry keeps its active regions as cards without moving historical positions',()=>{
 const before=JSON.stringify([...layout.positions]);
 const filtered=filterGraph(atlas.concepts,atlas.relationships,{...defaultState,disciplines:['physics']},'general-relativity','ancestors',index);
 const view=buildSummaryView(atlas.concepts,layout,filtered.visible,filtered.highlight,'branch');
 for(const id of filtered.highlight)assert(!view.endpoints.has(id));
 for(const s of view.summaries)for(const id of s.memberIds){assert(filtered.visible.has(id));assert(!filtered.highlight.has(id));}
 assert.equal(JSON.stringify([...layout.positions]),before);
 assert.equal(view.endpoints.has('tensor-calculus'),false);
});
test('summary footprints exactly match the historical pillar, independent of filters and input order',()=>{
 for(const level of ['section','branch'] as const){
  const view=buildSummaryView(atlas.concepts,layout,all,new Set(),level);
  for(const summary of view.summaries){
   const region=(level==='section'?layout.sections:layout.regions).find(r=>r.eraId===summary.eraId&&r.id===summary.groupId)!;
   assert.deepEqual(summary.position,{x:region.left,y:region.top});assert.equal(summary.width,region.width);assert.equal(summary.height,region.bottom-region.top);
   assert.deepEqual(summary.anchor,{x:region.left+region.width/2,y:(region.top+region.bottom)/2});
   const subset=buildSummaryView(atlas.concepts,layout,new Set([summary.memberIds[0]]),new Set(),level).summaries[0];
   assert.deepEqual(subset.position,summary.position);assert.equal(subset.width,summary.width);assert.equal(subset.height,summary.height);
  }
  assert.deepEqual(view,buildSummaryView([...atlas.concepts].reverse(),layout,all,new Set(),level));
 }
});
test('narrow pillar captions rotate and fit inside their own bounds',()=>{
 for(const [width,height] of [[384,3616],[3000,1480],[384,1480]])for(const zoom of [.02,.04,.1,.2,.31]){
  const fit=fitPillarTitle(width,height,zoom,210,23),w=fit.rotated?23*1.2:210,h=fit.rotated?210:23*1.2;
  assert(w*fit.scale<=Math.max(1,width*zoom-8)+1e-6);assert(h*fit.scale<=Math.max(1,height*zoom-8)+1e-6);
 }
 assert(fitPillarTitle(384,3616,.1,210,23).rotated);
 assert(!fitPillarTitle(3000,1480,.1,210,23).rotated);
});
test('repeated camera scales retain membership and cached routing geometry',()=>{
 const view=buildSummaryView(atlas.concepts,layout,all,new Set(),'section');
 const edge=atlas.relationships.find(e=>view.endpoints.get(e.source)!==view.endpoints.get(e.target))!;
 const source=view.endpoints.get(edge.source)!,target=view.endpoints.get(edge.target)!;
 const route=summaryRoute(source,target,view,layout);
 for(let i=0;i<120;i++)assert.equal(summaryRoute(source,target,view,layout),route);
 assert.equal(view.byId.get(source)?.id,source);assert(source.startsWith('region:section:'));
 assert(view.byId.has(regionId('section','modern','mathematics')));
});

test('summary bundles preserve distinct cited relationships, classifications and filters',()=>{
 const filtered=filterGraph(atlas.concepts,atlas.relationships,{...defaultState,disciplines:['physics','mathematics'],relations:['foundation','enables']},'general-relativity','neighbors',index);
 const view=buildSummaryView(atlas.concepts,layout,filtered.visible,filtered.highlight,'section');
 const bundles=summaryBundles(filtered.edges,view,index.byId,'section');
 const actual=bundles.flatMap(b=>b.memberIds),expected=filtered.edges.filter(e=>view.endpoints.has(e.source)||view.endpoints.has(e.target)).map(e=>e.id);
 assert.deepEqual([...actual].sort(),expected.sort());assert.equal(new Set(actual).size,actual.length);
 for(const b of bundles)for(const id of b.memberIds){const e=filtered.edges.find(e=>e.id===id)!;assert.equal(e.type,b.type);assert.equal(e.evidence,b.evidence);assert(e.sourceIds.length);}
 const originalPillars=index.pillars.map(c=>[c.id,index.direct(c.id),index.walk(c.id,'outgoing').size]);
 summaryBundles(atlas.relationships,view,index.byId,'branch');
 assert.deepEqual(index.pillars.map(c=>[c.id,index.direct(c.id),index.walk(c.id,'outgoing').size]),originalPillars);
});
test('summary connections terminate on rendered endpoints, including internal loops',()=>{
 const view=buildSummaryView(atlas.concepts,layout,all,new Set(),'section');
 for(const edge of atlas.relationships){
  const from=view.endpoints.get(edge.source)!,to=view.endpoints.get(edge.target)!;
  const route=summaryRoute(from,to,view,layout);
  assertCleanRoute(route.points,edge.id);
  assert(route.points.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));assert(!route.path.includes('NaN'));
  const s=view.summaries.find(s=>s.id===from)!,t=view.summaries.find(s=>s.id===to)!;
  assert.deepEqual(route.points[0],{x:s.position.x+s.width/2,y:s.position.y});
  assert.deepEqual(route.points.at(-1),{x:t.position.x+t.width/2,y:t.position.y+t.height});
 }
});

test('era tags retain isolated band centers and spread crowded tags in screen order',()=>{
 assert.deepEqual(placeEraTags([35,140,255],300).positions,[35,140,255]);
 const crowded=placeEraTags([90,100,110],240);
 assert.equal(crowded.positions[1],100);
 assert(crowded.positions.every((v,i,a)=>!i||v-a[i-1]>=ERA_TAG_HEIGHT));
 const short=placeEraTags([2,12,25,40,80],90);
 assert.equal(short.positions.length,5);assert(short.trackHeight>90);
 assert.equal(short.positions[0],ERA_TAG_HEIGHT/2);
 assert.equal(short.positions.at(-1),short.trackHeight-ERA_TAG_HEIGHT/2);
});

function crosses(a:{x:number;y:number},b:{x:number;y:number},r:{position:{x:number;y:number};width:number;height:number}){
 const {x,y}=r.position,epsilon=.01;
 return a.x===b.x?a.x>x+epsilon&&a.x<x+r.width-epsilon&&Math.max(a.y,b.y)>y+epsilon&&Math.min(a.y,b.y)<y+r.height-epsilon:a.y>y+epsilon&&a.y<y+r.height-epsilon&&Math.max(a.x,b.x)>x+epsilon&&Math.min(a.x,b.x)<x+r.width-epsilon;
}
test('pillar routes avoid unrelated collapsed regions and retained cards across eras',()=>{
 for(const level of ['section','branch'] as const){
  const selected=filterGraph(atlas.concepts,atlas.relationships,defaultState,'general-relativity','ancestors',index);
  const view=buildSummaryView(atlas.concepts,layout,all,selected.highlight,level);
  const obstacles=[...view.summaries,...atlas.concepts.filter(c=>!view.endpoints.has(c.id)).map(c=>({id:c.id,position:layout.positions.get(c.id)!,width:NODE_WIDTH,height:NODE_HEIGHT}))];
  for(const edge of atlas.relationships){
   const source=view.endpoints.get(edge.source)??edge.source,target=view.endpoints.get(edge.target)??edge.target;
   if(source===edge.source&&target===edge.target)continue;
   const route=summaryRoute(source,target,view,layout);
   for(let i=1;i<route.points.length;i++)for(const r of obstacles){
    if(r.id===source||r.id===target)continue;
    assert(!crosses(route.points[i-1],route.points[i],r),`${level}: ${edge.id} crosses ${r.id}`);
   }
  }
 }
});

test('viewport culling checks actual routed segments rather than the empty endpoint rectangle',()=>{
 const route={points:[{x:0,y:0},{x:0,y:1000},{x:1000,y:1000}],path:'',label:{x:0,y:500}};
 assert(!routeInViewport(route,[-400,-400,1],100,100));
 assert(routeInViewport(route,[0,-400,1],100,100));
 assert(routeInViewport(route,[-400,-940,1],100,100));
 assert(routeInViewport(route,[50,50,.05],200,200));
});

test('pinching on a delegated pillar keeps the midpoint anchored and clamps zoom',()=>{
 const gesture={viewport:{x:10,y:20,zoom:.5},midpoint:{x:100,y:200},distance:100};
 assert.deepEqual(pinchViewport(gesture,{x:0,y:200},{x:200,y:200}),{x:-80,y:-160,zoom:1});
 assert.equal(pinchViewport(gesture,{x:-1000,y:200},{x:1000,y:200}).zoom,1.5);
 assert.equal(pinchViewport(gesture,{x:100,y:200},{x:100,y:200}).zoom,.02);
});
