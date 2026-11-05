import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, memo } from 'react';
import { ReactFlow, ReactFlowProvider, Handle, Position, useReactFlow, useStore, BaseEdge, EdgeLabelRenderer, ViewportPortal, type NodeProps, type Node, type Edge } from '@xyflow/react';
import { Search, ArrowUpRight, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, X, Plus, Minus, Maximize, Compass, BookOpen, Columns3, GitBranch, List, Map as MapIcon, SlidersHorizontal, RotateCcw, Link2, Check, ChevronRight, ExternalLink, Info } from 'lucide-react';
import type {MessageKey} from './i18n/messages';
import {LocaleProvider,useLocale} from './i18n/LocaleProvider';
import {readPreferredLocale,savePreferredLocale,isComposing,type Locale} from './i18n/language';
import {englishConceptTitle,searchLocalizedConcepts} from './i18n/content';
import { atlas } from './data/atlas';
import { disciplines, eras, eraFor } from './config';
import { indexGraph,layoutGraph,filterGraph,NODE_WIDTH,NODE_HEIGHT,routeRelationships,buildBundles,visibleBundles,eraBandAt,routeInViewport,type Bundle,type Route,type Region } from './graph';
import { defaultState,parseState,serializeState,type ViewState } from './state';
import type { Concept,Discipline,Relationship,RelationType,Standing } from './types';
import {MotionConnections} from './MotionConnections';
import {MotionBenchmark,benchmarkEnabled,recordRender} from './benchmark';
import { Expression } from './Expression';
import { sectionOrder } from './branches';
import {cameraIntent,type CameraState,type CameraIntent} from './interaction';
import {useViewportPresentation,type PillarLabels} from './viewport';
import {useEdgePan} from './useEdgePan';
import {EraRuler} from './EraRuler';
import {PillarTooltip} from './PillarTooltip';
import {useSidebarVisibility} from './useSidebarVisibility';
import {PanelLeftClose,PanelLeftOpen} from 'lucide-react';
import {buildSummaryView,summaryBundles,regionId,summaryRoute,type BranchSummary,type SummaryLevel} from './overview';

const index=indexGraph(atlas), layout=layoutGraph(atlas.concepts);
const routes=routeRelationships(layout,atlas.relationships),bundleCatalog=buildBundles(atlas.concepts,atlas.relationships);
const edgeIndex=new Map(atlas.relationships.map(e=>[e.id,e]));
const sourceIndex=new Map(atlas.sources.map(s=>[s.id,s]));
const routeTrack=(id:string)=>[...id].reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,7);
const pillarIds=new Set(index.pillars.map(c=>c.id));
const sceneryNodes:Node[]=[
 ...layout.bands.map((b,i)=>({id:`era-${b.id}`,type:'era',position:{x:b.left,y:b.top},data:{...eras.find(e=>e.id===b.id),height:b.bottom-b.top,number:i+1},width:b.width,height:b.bottom-b.top,style:{width:b.width,height:b.bottom-b.top},draggable:false,selectable:false,focusable:false,zIndex:-10})),
 ...layout.bands.slice(1).map((b,i)=>({id:`join-${b.id}`,type:'join',position:{x:layout.left,y:b.bottom},data:{lower:layout.bands[i].id,upper:b.id},width:layout.width,height:layout.bands[i].top-b.bottom,style:{width:layout.width,height:layout.bands[i].top-b.bottom},draggable:false,selectable:false,focusable:false,zIndex:-11}))
];
const motionDuration=(milliseconds:number)=>window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:milliseconds;
type ConceptData={concept:Concept;dim:boolean;context:boolean;selected:boolean;display:ViewState['display'];onSelect:(id:string)=>void};
const ConceptNode=memo(({data}:NodeProps<Node<ConceptData>>)=>{
 const {msg,disciplines,standings,kindLabel}=useLocale();
 recordRender('concept');
 const c=data.concept,d=disciplines[c.discipline],pillar=pillarIds.has(c.id),formal=data.display==='formal'&&c.representation;
 return <button className={`concept-node ${formal?'formal-node':''} ${pillar?'pillar':''} ${data.selected?'selected':''} ${data.dim?'dim':''} ${data.context?'context-node':''}`} style={{'--discipline':d.color} as React.CSSProperties} onClick={()=>data.onSelect(c.id)} aria-label={`${c.title}, ${c.date.label}, ${d.label}${pillar?msg(", pillar of the atlas"):''}${formal?`, ${kindLabel(formal.kind)}: ${formal.expression}`:''}`}>
  <Handle type="target" position={Position.Bottom} isConnectable={false}/>
  <div className="node-meta"><span>{d.symbol} {d.label}</span>{pillar&&<Columns3 size={12} aria-label={msg("Pillar")}/>}</div>
  <strong>{c.title}</strong><div className="node-date">{c.date.label}{c.standing==='speculative'||c.standing==='superseded'||c.standing==='open'?<span className="node-status">{standings[c.standing]}</span>:null}</div>
  {formal?<div className={`node-representation ${formal.kind} ${formal.expression.length<30?'compact':''} ${formal.expression.length>40?'long':''}`} title={formal.explanation}><Expression text={formal.expression}/></div>:<p>{c.summary}</p>}<Handle type="source" position={Position.Top} isConnectable={false}/>
 </button>;
});
const EraNode=memo(({data}:NodeProps)=>{
 const {eras,formatPeriod}=useLocale();
 const band=layout.bands.find(b=>b.id===data.id)!;
 return <div className="era-band" style={{height:band.bottom-band.top} as React.CSSProperties}><div className="era-band-heading"><span>{String(Number(data.number)).padStart(2,'0')}</span><strong>{eras.find(e=>e.id===data.id)?.label}</strong><small>{eras.find(e=>e.id===data.id)?.range}</small></div>
 {layout.rows.filter(r=>r.eraId===band.id).map(r=><div className="floor-rule" key={r.id} style={{top:r.y-band.top+NODE_HEIGHT+28}}><span>{formatPeriod(r)}</span></div>)}
 </div>;
});
const JoinNode=memo(({data}:NodeProps)=>{
 const lower=layout.bands.find(b=>b.id===data.lower)!,upper=layout.bands.find(b=>b.id===data.upper)!,height=lower.top-upper.bottom;
 return <svg width={layout.width} height={height} className="era-join" aria-hidden="true">{sectionOrder.map(id=>{const a=layout.sections.find(r=>r.eraId===lower.id&&r.id===id),b=layout.sections.find(r=>r.eraId===upper.id&&r.id===id);if(!a||!b)return null;return <path key={id} d={`M ${a.left-layout.left} ${height} C ${a.left-layout.left} ${height/2}, ${b.left-layout.left} ${height/2}, ${b.left-layout.left} 0 L ${b.left+b.width-layout.left} 0 C ${b.left+b.width-layout.left} ${height/2}, ${a.left+a.width-layout.left} ${height/2}, ${a.left+a.width-layout.left} ${height} Z`} fill={`${disciplines[id].color}08`} stroke={`${disciplines[id].color}25`} vectorEffect="non-scaling-stroke"/>;})}</svg>;
});
type RegionData={region:Region;level:'section'|'branch';summary?:BranchSummary;labels:PillarLabels;onReveal:(summary:BranchSummary)=>void};
const PillarNode=memo(({data}:NodeProps<Node<RegionData>>)=>{
 const {msg,locale,disciplines,eras,groupLabel}=useLocale();
 const {region:r,level,summary,labels,onReveal}=data,caption=useRef<HTMLSpanElement>(null),d=disciplines[r.discipline];
 useLayoutEffect(()=>{if(caption.current&&summary)return labels.register(caption.current,summary);},[labels,summary,locale]);
 const label=groupLabel(r.id),description=msg("Explore {branch} in {era}",{branch:label,era:eras.find(e=>e.id===r.eraId)?.label??''})+(summary?msg(", {count} ideas",{count:summary.memberIds.length}):'');
 return <div className={`pillar-region ${level==='section'?'science-section':'branch-region'} ${summary?'collapsed-pillar nopan nodrag':''}`} data-collapsed={!!summary} role={summary?'button':undefined} tabIndex={summary?0:undefined} aria-label={summary?description:undefined} data-pillar-title={summary?label:undefined} style={{'--discipline':d.color,borderColor:`${d.color}40`,background:level==='section'?`${d.color}08`:undefined} as React.CSSProperties} onClick={summary?()=>onReveal(summary):undefined} onKeyDown={summary?e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onReveal(summary);}}:undefined}>
  <svg className="pillar-outline" aria-hidden="true" width="100%" height="100%"><path d={level==='section'?`M .5 0 V ${r.bottom-r.top} M ${r.width-.5} 0 V ${r.bottom-r.top}`:`M .5 0 V ${r.bottom-r.top}`} stroke={d.color} strokeOpacity={level==='section'?.35:.17} strokeWidth={.65} strokeDasharray={level==='branch'?'3 5':undefined} vectorEffect="non-scaling-stroke"/></svg>
  <Handle type="target" position={Position.Bottom}/>
  {summary?<span key="summary-caption" ref={caption} className={`pillar-caption pillar-caption-${level}`}><strong>{d.symbol} {label}</strong><small>{msg("{count} ideas",{count:summary.memberIds.length})}</small></span>:level==='section'?<strong key="section-heading">{d.symbol} {label}</strong>:<span key="branch-heading" className="branch-heading">{label}</span>}
  <Handle type="source" position={Position.Top}/>
 </div>;
});
const AtlasEdge=memo(({edge:props}:{edge:Edge})=>{
 const {msg}=useLocale();
 recordRender('edge');
 const {getZoom}=useReactFlow();
 const route=props.data?.route as Route|undefined,count=Number(props.data?.count??0);
 const inView=useStore(s=>routeInViewport(route,s.transform,s.width,s.height));
 if(!route||!inView)return null;
 const select=()=>{const onSelect=props.data?.onSelect as (id:string)=>void;onSelect(props.id);};
 return <g className={`react-flow__edge nopan ${props.selected?'selected':''} ${props.style?.stroke==='#386454'?'active':''}`} data-id={props.id} role="button" tabIndex={0} aria-label={props.ariaLabel} onClick={select} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select();}}}><BaseEdge id={props.id} path={route.path} style={{...props.style,'--edge-width':props.style?.strokeWidth??1} as React.CSSProperties} markerEnd={props.style?.stroke==='#386454'?'url(#arrow-active)':'url(#arrow-muted)'} interactionWidth={18}/>{count>1&&<EdgeLabelRenderer><button ref={element=>{if(element)element.style.setProperty('--label-scale',String(1/getZoom()));}} className={`bundle-count nodrag nopan ${props.selected?'selected':''}`} style={{transform:`translate(${route.label.x}px,${route.label.y}px) scale(var(--label-scale,1)) translate(-50%,-50%)`}} onClick={()=>{const select=props.data?.onSelect as (id:string)=>void;select(props.id);}} aria-label={msg("Read bundle of {v0} relationships",{v0:count})}>{count}</button></EdgeLabelRenderer>}</g>;
});
const nodeTypes={concept:ConceptNode,era:EraNode,join:JoinNode,region:PillarNode};
const noEdges:Edge[]=[];
const ConnectionsLayer=memo(({edges}:{edges:Edge[]})=>{const {msg}=useLocale();return <ViewportPortal><MotionConnections edges={edges}/><svg className="connection-canvas" width="1" height="1" aria-label={msg("Historical connections")}><defs>{[['active','#386454'],['muted','#849488']].map(([id,color])=><marker key={id} id={`arrow-${id}`} viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill={color}/></marker>)}</defs>{edges.map(edge=><AtlasEdge key={edge.id} edge={edge}/>)}</svg></ViewportPortal>;});
function BranchRuler({onNavigate,level}:{onNavigate:(id:string)=>void;level:SummaryLevel}){
 const {msg,eras,disciplines,branchIndex}=useLocale();
 const transform=useStore(s=>s.transform),height=useStore(s=>s.height),width=useStore(s=>s.width);
 const cy=(height/2-transform[1])/transform[2],band=eraBandAt(layout,cy);
 if(level==='section')return <div className="branch-ruler overview-ruler"><strong>{msg("Branch overview")}</strong><span>{msg("Choose a name to reveal its ideas.")}</span></div>;
 return <div className="branch-ruler" aria-label={msg("Science sections in {v0}",{v0:eras.find(e=>e.id===band.id)?.short??''})}>{(transform[2]<.32?layout.sections:layout.regions).filter(r=>r.eraId===band.id).map(r=>{const left=r.left*transform[2]+transform[0],right=(r.left+r.width)*transform[2]+transform[0],visible=Math.min(width,right)-Math.max(0,left);if(visible<42)return null;return <button key={r.id} onClick={()=>onNavigate(r.id)} style={{left:Math.max(0,left),width:visible,borderColor:disciplines[r.discipline].color,color:disciplines[r.discipline].color}} title={`${disciplines[r.discipline].label} / ${branchIndex.get(r.id)?.label}`}>{transform[2]>=.32&&visible>180?branchIndex.get(r.id)?.label:disciplines[r.discipline].label}</button>;})}</div>;
}
const MinimapArtwork=memo(({visible,selected}:{visible:Set<string>;selected:string})=>{
 const top=layout.bands.at(-1)!.top,total=layout.bands[0].bottom-top;
 const x=(v:number)=>4+(v-layout.left)/layout.width*92,y=(v:number)=>5+(v-top)/total*132,nodeWidth=NODE_WIDTH/layout.width*92;
 return <g>{layout.sections.map(b=><rect key={`${b.eraId}-${b.id}`} x={x(b.left)} y={y(b.top)} width={b.width/layout.width*92} height={(b.bottom-b.top)/total*132} fill="none" stroke={disciplines[b.discipline].color} strokeWidth=".4"/>)}
 {atlas.concepts.map(c=>{const p=layout.positions.get(c.id)!;return <rect key={c.id} x={x(p.x)} y={y(p.y)} width={nodeWidth} height="1.4" rx=".5" fill={disciplines[c.discipline].color} opacity={visible.has(c.id)?.8:.1}/>;})}
 {selected&&layout.positions.has(selected)&&<circle cx={x(layout.positions.get(selected)!.x)+nodeWidth/2} cy={y(layout.positions.get(selected)!.y)} r="2" fill="#213e25"/>}</g>;
});
function TowerOverview({visible,selected}:{visible:Set<string>;selected:string}){
 const {msg}=useLocale();
 const transform=useStore(s=>s.transform),width=useStore(s=>s.width),height=useStore(s=>s.height);
 const {setCenter,fitView}=useReactFlow();
 const top=layout.bands.at(-1)!.top,bottom=layout.bands[0].bottom,total=bottom-top;
 const x=(v:number)=>4+(v-layout.left)/layout.width*92,y=(v:number)=>5+(v-top)/total*132;
 const jump=(e:React.PointerEvent<SVGSVGElement>)=>{const r=e.currentTarget.getBoundingClientRect();const gx=((e.clientX-r.left)/r.width*100-4)/92*layout.width+layout.left;const gy=((e.clientY-r.top)/r.height*142-5)/132*total+top;setCenter(gx,gy,{zoom:.8,duration:motionDuration(250)});};
 return <div className="tower-overview"><span>{msg("THE WHOLE TOWER")}</span><svg viewBox="0 0 100 142" role="button" tabIndex={0} aria-label={msg("Full tower map. Click to navigate; press Enter to view the entire tower.")} onPointerDown={jump} onPointerMove={e=>{if(e.buttons===1)jump(e);}} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();fitView({includeHiddenNodes:true,nodes:atlas.concepts.map(c=>({id:c.id})),padding:.1});}}}>
  <MinimapArtwork visible={visible} selected={selected}/>
  <rect x={Math.max(0,x(-transform[0]/transform[2]))} y={Math.max(0,y(-transform[1]/transform[2]))} width={Math.min(100,width/transform[2]/layout.width*92)} height={Math.max(3,Math.min(132,height/transform[2]/total*132))} fill="#48663b18" stroke="#426239" strokeWidth=".7"/>

 </svg><div><small>{msg("Past")}</small><small>{msg("↑ Present")}</small></div></div>;
}

function useUrlState(){
 const [state,setState]=useState<ViewState>(()=>parseState(window.location.hash,readPreferredLocale()));
 const stateRef=useRef(state);
 useEffect(()=>{const url=window.location.pathname+window.location.search+serializeState(stateRef.current);window.history.replaceState(null,'',url);},[]);
 useEffect(()=>{const update=()=>{const next=parseState(window.location.hash,readPreferredLocale());stateRef.current=next;setState(next);};window.addEventListener('hashchange',update);window.addEventListener('popstate',update);return()=>{window.removeEventListener('hashchange',update);window.removeEventListener('popstate',update);};},[]);
 const change=useCallback((patch:Partial<ViewState>,replace=false)=>{const next={...stateRef.current,...patch};const url=window.location.pathname+window.location.search+serializeState(next);if(replace)window.history.replaceState(null,'',url);else window.history.pushState(null,'',url);stateRef.current=next;setState(next);},[]);
 return [state,change] as const;
}
function Logo(){return <svg width="37" height="43" viewBox="0 0 44 48" fill="none" aria-hidden="true"><g stroke="currentColor" strokeWidth="1.4"><path d="M3 44h38M8 38h28M12 31h20M16 24h12M20 17h4M22 3v14M8 38V24L22 6l14 18v14M12 31V22M32 31V22"/><path d="M3 44l5-6M41 44l-5-6"/></g></svg>}
function App(){return <ReactFlowProvider><AtlasRoot/></ReactFlowProvider>}
function AtlasRoot(){const [state,change]=useUrlState();return <LocaleProvider locale={state.locale}><AtlasApp state={state} change={change}/></LocaleProvider>;}
function DisplaySwitch({value,onChange,label}:{value:ViewState['display'];onChange:(display:ViewState['display'])=>void;label:string}){
 const {msg}=useLocale();
 return <div className="display-switch" role="group" aria-label={label}><button aria-pressed={value==='language'} onClick={()=>onChange('language')}>{msg("Aa")}<span>{msg("Words")}</span></button><button aria-pressed={value==='formal'} onClick={()=>onChange('formal')}>∑ <span>{msg("Formulas & definitions")}</span></button></div>;
}
function RepresentationDetail({concept:c}:{concept:Concept}){
 const {msg,kindLabel}=useLocale();
 const r=c.representation;if(!r)return null;
 return <figure className={`equation representation-detail ${r.kind}`}><span className="eyebrow">{msg("Representative {kind}",{kind:kindLabel(r.kind)})}</span><div><Expression text={r.expression}/></div><figcaption>{r.explanation}<Citations ids={r.sourceIds}/></figcaption><small>{msg("Modern notation or a compact definition; not necessarily its original historical form.")}</small></figure>;
}
function AtlasApp({state,change}:{state:ViewState;change:(patch:Partial<ViewState>,replace?:boolean)=>void}){
 const {msg,locale,atlas,index,edgeIndex,disciplines,relations,standings,eras,branches,branchIndex,groupLabel,evidenceLabel,ariaLabelConfig}=useLocale();
 recordRender('app');

 const [query,setQuery]=useState(''),[searchOpen,setSearchOpen]=useState(false),[activeTab,setActiveTab]=useState<'explore'|'journeys'|'pillars'>('explore');
 const [methodology,setMethodology]=useState(false),[mobileNav,setMobileNav]=useState(false),[edgeId,setEdgeId]=useState(''),[copied,setCopied]=useState(false),[initialized,setInitialized]=useState(false),[linkError,setLinkError]=useState<MessageKey|''>('');
 const [detailCollapsed,setDetailCollapsed]=useState(false),[expanded,setExpanded]=useState<Set<string>>(new Set()),[browseBundles,setBrowseBundles]=useState(false),[selectedMembers,setSelectedMembers]=useState<string[]|null>(null);

 const currentEra=useStore(s=>{const cy=(s.height/2-s.transform[1])/s.transform[2];return eraBandAt(layout,cy).id;});
 const {setCenter,fitView,zoomIn,zoomOut,getViewport}=useReactFlow();
 const graphSurface=useEdgePan(),{level:detailLevel,labels}=useViewportPresentation(graphSurface);
 const sidebar=useSidebarVisibility(graphSurface);
 const sidebarLabel=msg(sidebar.hidden?'Show sidebar':'Hide sidebar');
 // Refresh once after the document language and all pillar text have updated.
 useEffect(()=>labels.refreshFonts(),[labels,locale]);
 const bundleLevel=detailLevel==='section'?'section':'branch';
 const cameraPrevious=useRef<CameraState|null>(null),pendingCamera=useRef<CameraIntent|null>(null);
 const [cameraRequest,setCameraRequest]=useState(0);
 const queueCamera=useCallback((intent:CameraIntent)=>{pendingCamera.current=intent;setCameraRequest(n=>n+1);},[]);
 const viewportWidth=useStore(s=>s.width),viewportHeight=useStore(s=>s.height);
 const rootXs=layout.rows[0].ids.map(id=>layout.positions.get(id)!.x),homeX=(Math.min(...rootXs)+Math.max(...rootXs)+NODE_WIDTH)/2,homeZoom=Math.min(.72,Math.max(.2,(viewportWidth-50)/(Math.max(...rootXs)-Math.min(...rootXs)+NODE_WIDTH+70))),homeY=NODE_HEIGHT/2-viewportHeight/homeZoom*.18;
 const showCaption=useStore(s=>-s.transform[1]/s.transform[2]>-2500&&s.transform[2]>.3);
 const searchRef=useRef<HTMLInputElement>(null),navigationTarget=useRef<{x:number;y:number;zoom:number}|null>(null);
 const current=index.byId.get(state.concept),currentTour=atlas.tours.find(t=>t.id===state.tour),step=currentTour?.steps[Math.min(state.step,currentTour.steps.length-1)];
 const filtered=useMemo(()=>filterGraph(atlas.concepts,atlas.relationships,state,state.concept,state.trace,index),[state,atlas,index]);
 const results=useMemo(()=>searchLocalizedConcepts(query,locale),[query,locale]);
 const selectConnection=useCallback((id:string,members?:string[])=>{setSelectedMembers(members??null);setEdgeId(id);setDetailCollapsed(false);setBrowseBundles(false);},[]);
 const goTo=useCallback((id:string)=>{setEdgeId('');setBrowseBundles(false);setDetailCollapsed(false);navigationTarget.current=null;queueCamera({kind:'concept',id});change({concept:id,trace:'neighbors',tour:'',step:0});setQuery('');setSearchOpen(false);setMobileNav(false);},[change,queueCamera]);
 useEffect(()=>setDetailCollapsed(false),[state.concept,edgeId,state.tour,state.step]);
 const centerConcept=useCallback((id:string,duration=550)=>{const p=layout.positions.get(id);if(p)setCenter(p.x+NODE_WIDTH/2,p.y+NODE_HEIGHT/2,{zoom:.95,duration:motionDuration(duration)});},[setCenter]);
 useEffect(()=>{
  if(!initialized||state.view!=='tower'||!viewportWidth||!viewportHeight)return;
  const next={concept:state.concept,era:state.era,view:state.view};
  const intent=cameraIntent(cameraPrevious.current,next);cameraPrevious.current=next;
  if(intent)pendingCamera.current=intent;
  if(pendingCamera.current?.kind==='concept'&&pendingCamera.current.id!==state.concept)pendingCamera.current=null;
  if(!pendingCamera.current)return;
  // Let the detail panel and ResizeObserver settle before consuming this one camera action.
  let frame=requestAnimationFrame(()=>{frame=requestAnimationFrame(()=>{
   const action=pendingCamera.current;pendingCamera.current=null;
   if(action?.kind==='concept')centerConcept(action.id);
   else if(action?.kind==='point')setCenter(action.x,action.y,{zoom:action.zoom,duration:motionDuration(400)});
   else if(action?.kind==='era')fitView({includeHiddenNodes:true,nodes:atlas.concepts.filter(c=>eraFor(c.date.year).id===action.id).map(c=>({id:c.id})),padding:.12,maxZoom:.7,duration:0});
   else if(action?.kind==='home')setCenter(homeX,homeY,{zoom:homeZoom,duration:0});
  });});
  return()=>cancelAnimationFrame(frame);
 },[initialized,state.concept,state.era,state.view,viewportWidth,viewportHeight,homeX,homeY,homeZoom,centerConcept,setCenter,fitView,cameraRequest]);
 useEffect(()=>{if(currentTour&&step&&state.concept!==step.conceptId)change({concept:step.conceptId},true);},[currentTour,step,state.concept,change]);
 useEffect(()=>{if(state.concept&&!current){setLinkError('This concept is not in this edition. Search the atlas to find another idea.');change({concept:''},true);}else if(state.tour&&!currentTour){setLinkError('That journey could not be found. Choose an available journey.');change({tour:'',step:0},true);}else if(currentTour&&state.step>=currentTour.steps.length){change({step:currentTour.steps.length-1,concept:currentTour.steps.at(-1)!.conceptId},true);}},[state.concept,state.tour,state.step,current,currentTour,change]);
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if(isComposing(e))return;if(e.key==='Escape'){setSearchOpen(false);setMethodology(false);setMobileNav(false);setEdgeId('');}if((e.ctrlKey||e.metaKey)&&e.key==='k'){e.preventDefault();searchRef.current?.focus();}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[]);
 const inspectionActive=useMemo(()=>{
  const active=new Set(filtered.highlight);
  for(const e of filtered.edges)if(expanded.has(e.id)||e.id===edgeId){active.add(e.source);active.add(e.target);}
  return active;
 },[filtered,expanded,edgeId]);
 const summaryView=useMemo(()=>{recordRender('summary');return buildSummaryView(atlas.concepts,layout,filtered.visible,inspectionActive,detailLevel);},[filtered.visible,inspectionActive,detailLevel]);
 const revealSummary=useCallback((summary:BranchSummary)=>{
  const ps=summary.memberIds.map(id=>layout.positions.get(id)!);
  const left=Math.min(...ps.map(p=>p.x)),right=Math.max(...ps.map(p=>p.x))+NODE_WIDTH,top=Math.min(...ps.map(p=>p.y)),bottom=Math.max(...ps.map(p=>p.y))+NODE_HEIGHT;
  const fit=Math.min(.9,(viewportWidth-80)/(right-left),(viewportHeight-100)/(bottom-top)),nearest=[...ps].sort((a,b)=>Math.hypot(a.x+NODE_WIDTH/2-summary.anchor.x,a.y+NODE_HEIGHT/2-summary.anchor.y)-Math.hypot(b.x+NODE_WIDTH/2-summary.anchor.x,b.y+NODE_HEIGHT/2-summary.anchor.y))[0];
  const target={x:fit<.55?nearest.x+NODE_WIDTH/2:(left+right)/2,y:fit<.55?nearest.y+NODE_HEIGHT/2:(top+bottom)/2,zoom:Math.max(.55,fit)};
  navigationTarget.current=target;queueCamera({kind:'point',...target});
 },[viewportWidth,viewportHeight,queueCamera]);
 const overviewBundles=useMemo(()=>summaryBundles(filtered.edges,summaryView,index.byId,bundleLevel),[filtered.edges,summaryView,bundleLevel]);
 const selectedBundleRef=useRef<Bundle|undefined>(undefined);
 const displayEdges=useMemo(()=>{
  recordRender('routes');
  const individual=new Set(filtered.edges.filter(e=>state.connections==='all'||(filtered.highlight.has(e.source)&&filtered.highlight.has(e.target))||expanded.has(e.id)||e.source===state.concept||e.target===state.concept||e.id===edgeId).map(e=>e.id));
  const ordinary=filtered.edges.filter(e=>!summaryView.endpoints.has(e.source)&&!summaryView.endpoints.has(e.target));
  const bundles=state.connections==='bundled'?visibleBundles(bundleCatalog,ordinary,bundleLevel,individual):[];
  const all=filtered.edges.filter(e=>individual.has(e.id)).map(e=>{const source=summaryView.endpoints.get(e.source)??e.source,target=summaryView.endpoints.get(e.target)??e.target;return {id:e.id,source,target,type:e.type,route:source!==e.source||target!==e.target?summaryRoute(source,target,summaryView,layout,routeTrack(e.id)):routes.get(e.id)!,members:[e.id],bundle:false};});
  const overview=state.connections==='bundled'?overviewBundles.map(b=>{
   const members=b.memberIds.filter(id=>!individual.has(id));if(!members.length)return null;
   const first=edgeIndex.get(members[0])!,source=summaryView.endpoints.get(first.source)??first.source,target=summaryView.endpoints.get(first.target)??first.target;
   return {id:b.id,source,target,type:b.type,route:summaryRoute(source,target,summaryView,layout,routeTrack(b.id)),members,bundle:true};
  }).filter((b):b is NonNullable<typeof b>=>!!b):[];
  return [...all,...bundles.map(b=>({id:b.id,source:edgeIndex.get(b.routeId)!.source,target:edgeIndex.get(b.routeId)!.target,type:b.type,route:routes.get(b.routeId)!,members:b.memberIds,bundle:true})),...overview];
 },[filtered,state.connections,state.concept,expanded,bundleLevel,summaryView,overviewBundles,edgeId]);
 const edges=useMemo<Edge[]>(()=>displayEdges.map(e=>{const active=e.members.some(id=>{if(expanded.has(id))return true;const r=edgeIndex.get(id)!;return filtered.highlight.has(r.source)&&filtered.highlight.has(r.target);});return {id:e.id,source:e.source,target:e.target,selected:e.id===edgeId,type:'atlas',data:{route:e.route,count:e.bundle?e.members.length:0,members:e.members,onSelect:(id:string)=>selectConnection(id,e.members)},style:{stroke:active?'#386454':e.bundle?'#849488':'#a5aea4',vectorEffect:'non-scaling-stroke',strokeWidth:active?1.7:e.bundle?Math.min(2,.55+Math.log2(e.members.length)*.25):.7,strokeDasharray:relations[e.type].dash,opacity:current?(active?.85:.045):e.bundle?.32:.45},markerEnd:{type:'arrowclosed' as const,color:active?'#386454':'#849488',width:12,height:12},ariaLabel:e.bundle?msg("{count} {relation} relationships. Press Enter to inspect bundle.",{count:e.members.length,relation:relations[e.type].label}):msg("{source}: {relation} for {target}",{source:index.byId.get(edgeIndex.get(e.members[0])!.source)?.title??'',relation:relations[e.type].label,target:index.byId.get(edgeIndex.get(e.members[0])!.target)?.title??''}),focusable:true,zIndex:active?1:0};}),[displayEdges,filtered,current,edgeId,selectConnection,expanded,locale,index,edgeIndex,relations,msg]);
 const nodes=useMemo<Node[]>(()=>{
  recordRender('nodes');
  return [
   ...sceneryNodes,
   ...(['section','branch'] as const).flatMap(level=>(level==='section'?layout.sections:layout.regions).map(region=>{
    const id=regionId(level,region.eraId,region.id),summary=summaryView.byId.get(id),hidden=level==='branch'&&summaryView.byId.has(regionId('section',region.eraId,region.discipline));
    return {id,type:'region',position:{x:region.left,y:region.top},hidden,data:{region,level,summary,labels,onReveal:revealSummary},width:region.width,height:region.bottom-region.top,style:{width:region.width,height:region.bottom-region.top,pointerEvents:summary?'auto' as const:'none' as const},zIndex:level==='section'?-8:-7,draggable:false,selectable:false,focusable:false};
   })),
   ...atlas.concepts.map(c=>({id:c.id,type:'concept',zIndex:2,position:layout.positions.get(c.id)!,hidden:!filtered.visible.has(c.id)||summaryView.endpoints.has(c.id),data:{concept:c,dim:!!current&&!filtered.highlight.has(c.id),context:!filtered.matching.has(c.id),selected:c.id===state.concept,display:state.display,onSelect:goTo},width:NODE_WIDTH,height:NODE_HEIGHT,draggable:false,connectable:false,focusable:false,style:{width:NODE_WIDTH,height:NODE_HEIGHT}}))
  ];
 },[summaryView,labels,revealSummary,filtered,current,state.concept,state.display,goTo,atlas]);
 const selectedEdge=edgeIndex.get(edgeId),liveBundle=[...overviewBundles,...bundleCatalog].find(b=>b.id===edgeId);
 if(liveBundle)selectedBundleRef.current=liveBundle;
 const selectedBundle=liveBundle??(selectedBundleRef.current?.id===edgeId?selectedBundleRef.current:undefined);
 const matchingBundleEdges=selectedBundle?filtered.edges.filter(e=>(selectedMembers??selectedBundle.memberIds).includes(e.id)):[];
 const expandBundle=()=>{const ids=[...new Set(matchingBundleEdges.flatMap(e=>[e.source,e.target]))],ps=ids.map(id=>layout.positions.get(id)!),left=Math.min(...ps.map(p=>p.x)),right=Math.max(...ps.map(p=>p.x))+NODE_WIDTH,top=Math.min(...ps.map(p=>p.y)),bottom=Math.max(...ps.map(p=>p.y))+NODE_HEIGHT;navigationTarget.current={x:(left+right)/2,y:(top+bottom)/2,zoom:Math.max(.02,Math.min(.85,(viewportWidth-80)/(right-left),(viewportHeight-100)/(bottom-top)))};setExpanded(previous=>new Set([...previous,...matchingBundleEdges.map(e=>e.id)]));setEdgeId('');setBrowseBundles(false);change({concept:'',tour:''});const p=navigationTarget.current;queueCamera({kind:'point',...p});};
 const navigateBranch=(id:string)=>{const navEra=state.era||currentEra;const regions=branchIndex.has(id)?layout.regions:layout.sections;const region=regions.find(r=>r.id===id&&r.eraId===navEra)??regions.filter(r=>r.id===id).sort((a,b)=>Math.abs(eras.findIndex(e=>e.id===a.eraId)-eras.findIndex(e=>e.id===navEra))-Math.abs(eras.findIndex(e=>e.id===b.eraId)-eras.findIndex(e=>e.id===navEra)))[0];if(region){const v=getViewport(),cy=(viewportHeight/2-v.y)/v.zoom,nearby=atlas.concepts.filter(c=>(branchIndex.has(id)?c.branchId===id:c.discipline===id)&&eraFor(c.date.year).id===region.eraId).map(c=>layout.positions.get(c.id)!).sort((a,b)=>Math.abs(a.y+NODE_HEIGHT/2-cy)-Math.abs(b.y+NODE_HEIGHT/2-cy));navigationTarget.current={x:region.left+region.width/2,y:nearby.length?nearby[0].y+NODE_HEIGHT/2:(region.top+region.bottom)/2,zoom:Math.min(.85,viewportWidth/(region.width+80))};change({concept:'',tour:'',view:'tower',...(state.era&&region.eraId!==state.era?{era:region.eraId}:{})});const p=navigationTarget.current;queueCamera({kind:'point',...p});setMobileNav(false);}};
 const chooseEra=(id:string)=>{navigationTarget.current=null;change({era:id,concept:'',tour:'',trace:'neighbors'});setMobileNav(false);queueCamera({kind:'era',id});};
 const tourStep=(tourId:string,stepIndex:number)=>{const t=atlas.tours.find(t=>t.id===tourId)!;const s=Math.max(0,Math.min(stepIndex,t.steps.length-1));queueCamera({kind:'concept',id:t.steps[s].conceptId});change({...defaultState,locale:state.locale,display:state.display,tour:tourId,step:s,concept:t.steps[s].conceptId});setMobileNav(false);setEdgeId('');};
 const reset=()=>{navigationTarget.current=null;change({...defaultState,locale:state.locale,display:state.display});setQuery('');setEdgeId('');setLinkError('');setExpanded(new Set());setBrowseBundles(false);queueCamera({kind:'home'});};
 const copyLink=async()=>{try{await navigator.clipboard.writeText(window.location.href);setCopied(true);window.setTimeout(()=>setCopied(false),2000);}catch{setLinkError('Copy the address from your browser to share this view.');}};
 return <div className="app-shell">
  <a className="skip-link" href="#main-content" onClick={e=>{e.preventDefault();document.getElementById('main-content')?.focus();}}>{msg("Skip to atlas")}</a>
  <header className="masthead"><button type="button" className="sidebar-toggle icon-button" onClick={sidebar.toggle}
   aria-label={sidebarLabel} title={sidebarLabel} aria-controls="atlas-navigation" aria-expanded={!sidebar.hidden}>
   {sidebar.hidden?<PanelLeftOpen size={19}/>:<PanelLeftClose size={19}/>}
  </button>
   <button className="brand" onClick={reset} aria-label={msg("Tower of Science, return to foundations")}><Logo/><span><strong>{msg("Tower of Science")}</strong><small>{msg("AN ATLAS OF CONNECTED IDEAS")}</small></span></button>
   <div className="search-wrap"><Search size={17}/><input ref={searchRef} aria-label={msg("Search concepts or contributors")} placeholder={msg("Find an idea, a discovery, a mind…")} value={query} onChange={e=>{setQuery(e.target.value);setSearchOpen(true);}} onFocus={()=>setSearchOpen(true)} onKeyDown={e=>{if(!isComposing(e.nativeEvent)&&e.key==='Enter'&&results[0])goTo(results[0].id);}}/><kbd>{msg("⌘ K")}</kbd>
    {searchOpen&&query.trim()&&<div className="search-results"><div className="search-heading">{msg("{count} ideas found",{count:results.length})}<button onClick={()=>setSearchOpen(false)} aria-label={msg("Close search")}><X size={14}/></button></div>{results.length?results.slice(0,15).map(c=><button key={c.id} onClick={()=>goTo(c.id)}><span className="result-symbol" style={{color:disciplines[c.discipline].color}}>{disciplines[c.discipline].symbol}</span><span><strong>{c.title}</strong><small>{c.date.label} · {disciplines[c.discipline].label}</small></span><ArrowUpRight size={15}/></button>):<p>{msg("No matching ideas. Try “zero”, “Einstein”, or “evolution”.")}</p>}</div>}
   </div><label className="language-picker"><span className="sr-only">Language / 语言</span><select aria-label="Language / 语言" value={locale} onChange={event=>{const locale=event.target.value as Locale;savePreferredLocale(locale);change({locale});}}><option value="en" lang="en">English</option><option value="zh-CN" lang="zh-CN">简体中文</option></select></label><button className="method-button" onClick={()=>setMethodology(true)}><BookOpen size={16}/><span>{msg("About the atlas")}</span></button><button className="mobile-toggle icon-button" aria-label={msg("Open navigation and filters")} onClick={()=>setMobileNav(!mobileNav)}><SlidersHorizontal size={20}/></button>
  </header>
  <div className="workspace">
  {mobileNav&&<button className="nav-backdrop" aria-label={msg("Close navigation")} onClick={()=>setMobileNav(false)}/>}
  <aside id="atlas-navigation" className={`sidebar ${mobileNav?'mobile-open':''}`} data-desktop-hidden={sidebar.hidden} aria-label={msg("Atlas navigation")}>
   <div className="sidebar-intro"><span className="eyebrow">{msg("THE HUMAN PURSUIT OF KNOWLEDGE")}</span><h1>{msg("No idea")}<br/>{msg("stands alone.")}</h1><p>{msg("Discover the foundations.")}<br/>{msg("Follow the connections.")}</p></div>
   <div className="navigation-tabs" role="tablist" aria-label={msg("Browse atlas")}>{(['explore','journeys','pillars'] as const).map(t=><button key={t} role="tab" aria-selected={activeTab===t} className={activeTab===t?'active':''} onClick={()=>setActiveTab(t)}>{t==='explore'?<Compass size={14}/>:t==='journeys'?<GitBranch size={14}/>:<Columns3 size={14}/>}<span>{t==='explore'?msg("Explore"):t==='journeys'?msg("Journeys"):msg("Pillars")}</span></button>)}</div>
   <div className="sidebar-scroll">
   {activeTab==='explore'&&<><div className="section-label">{msg("CLIMB THROUGH TIME")}<ArrowUp size={13}/></div><nav className="era-nav" aria-label={msg("Historical eras")}>{[...eras].reverse().map((e,i)=><button key={e.id} className={state.era===e.id?'active':''} onClick={()=>chooseEra(e.id)}><span className="era-dot"/><span><strong>{e.short}</strong><small>{e.range}</small></span><span className="era-number">{String(eras.length-i).padStart(2,'0')}</span></button>)}</nav>
    <div className="filter-heading"><span className="section-label">{msg("SCIENCE SECTIONS")}</span>{(state.disciplines.length>0||state.branches.length>0)&&<button onClick={()=>change({disciplines:[],branches:[]})}>{msg("All")}</button>}</div><p className="sidebar-help">{msg("Tick to filter. Use an arrow to visit a branch in this era.")}</p><div className="branch-navigation">{sectionOrder.map(id=>{const d=disciplines[id];return <details key={id}><summary><label onClick={e=>e.stopPropagation()}><input type="checkbox" aria-label={msg("Filter {v0}",{v0:d.label})} checked={state.disciplines.includes(id)} onChange={()=>change({disciplines:state.disciplines.includes(id)?state.disciplines.filter(v=>v!==id):[...state.disciplines,id]})}/><span className="color-dot" style={{background:d.color}}/>{d.label}</label><small>{atlas.concepts.filter(c=>c.discipline===id).length}</small></summary>{branches.filter(b=>b.discipline===id).map(b=><div className="branch-nav-row" key={b.id}><label><input type="checkbox" checked={state.branches.includes(b.id)} onChange={()=>change({branches:state.branches.includes(b.id)?state.branches.filter(v=>v!==b.id):[...state.branches,b.id]})}/>{b.label}</label><button aria-label={msg("Visit {v0}",{v0:b.label})} onClick={()=>navigateBranch(b.id)}><ArrowUpRight size={15}/></button></div>)}</details>;})}</div>
    <details className="more-filters"><summary>{msg("Refine the connections")}<SlidersHorizontal size={13}/></summary><label className="standing-label">{msg("Current standing")}<select aria-label={msg("Filter by current standing")} value={state.standing} onChange={e=>change({standing:e.target.value as Standing|''})}><option value="">{msg("All standings")}</option>{Object.entries(standings).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label><div className="relation-filters">{Object.entries(relations).map(([id,r])=><label key={id}><input type="checkbox" checked={state.relations.includes(id as RelationType)} onChange={()=>change({relations:state.relations.includes(id as RelationType)?state.relations.filter(v=>v!==id):[...state.relations,id as RelationType]})}/>{r.label}</label>)}</div></details>
   </>}
   {activeTab==='journeys'&&<><div className="section-label">{msg("PATHS THROUGH THE TOWER")}</div><p className="sidebar-help">{msg("A few connected ideas can change how you see everything.")}</p>{atlas.tours.map((t,i)=><button className="tour-card" key={t.id} onClick={()=>tourStep(t.id,0)}><span className="tour-numeral" style={{color:t.color}}>{String(i+1).padStart(2,'0')}</span><span><strong>{t.title}</strong><small>{msg("{count} stops · Guided journey",{count:t.steps.length})}</small></span><ArrowUpRight size={16}/></button>)}</>}
   {activeTab==='pillars'&&<><div className="section-label">{msg("IDEAS THAT SUPPORT OTHERS")}</div><p className="sidebar-help">{msg("Five or more supported direct descendants make a pillar in this edition.")}</p>{index.pillars.map((c,i)=><button className="pillar-row" key={c.id} onClick={()=>goTo(c.id)}><span>{String(i+1).padStart(2,'0')}</span><div><strong>{c.title}</strong><small>{msg("{direct} direct · {total} total descendants",{direct:index.direct(c.id),total:index.walk(c.id,'outgoing').size})}</small></div><ChevronRight size={14}/></button>)}</>}
   </div><button className="sidebar-about" onClick={()=>{setMobileNav(false);setMethodology(true);}}><BookOpen size={16}/> {msg("About the atlas & methodology")}</button><div className="sidebar-footer"><span className="edition-dot"/><span>{msg("EDITION 02")}</span><span>{msg("{ideas} ideas · {connections} connections",{ideas:atlas.concepts.length,connections:atlas.relationships.length})}</span></div>
  </aside>
  <main id="main-content" className={`atlas-main ${(current||selectedEdge||selectedBundle||browseBundles)&&!detailCollapsed?'has-panel':''}`} tabIndex={-1}>
   <div className="canvas-toolbar"><div><span className="live-dot"/>{state.era?eras.find(e=>e.id===state.era)?.label:msg("The connected history of science")}<small>{msg("{count} ideas",{count:filtered.matching.size})}{filtered.visible.size>filtered.matching.size?msg(" + {v0} in context",{v0:filtered.visible.size-filtered.matching.size}):''}</small></div><div className="view-switch"><button title={msg("Tower view")} aria-label={msg("Tower view")} aria-pressed={state.view==='tower'} className={state.view==='tower'?'active':''} onClick={()=>change({view:'tower'})}><MapIcon size={15}/><span>{msg("Tower")}</span></button><button title={msg("Chronological list")} aria-label={msg("Chronological list")} aria-pressed={state.view==='list'} className={state.view==='list'?'active':''} onClick={()=>change({view:'list'})}><List size={15}/><span>{msg("Index")}</span></button></div></div>
   <div className="canvas-display"><label className="connection-mode"><span>{msg("Connections")}</span><select aria-label={msg("Connection display")} value={state.connections} onChange={e=>change({connections:e.target.value as ViewState['connections']})}><option value="bundled">{msg("Bundled")}</option><option value="focus">{msg("Focus only")}</option><option value="all">{msg("All connections")}</option></select></label><button className="browse-bundles" title={msg("Browse connection bundles")} aria-label={msg("Browse connection bundles")} onClick={()=>{setBrowseBundles(true);setEdgeId('');setDetailCollapsed(false);}}><GitBranch size={15}/></button><DisplaySwitch value={state.display} onChange={display=>change({display})} label={msg("Atlas content display")}/></div>
   {linkError&&<div className="notice" role="status">{msg(linkError)}<button aria-label={msg("Dismiss message")} onClick={()=>setLinkError('')}><X size={14}/></button></div>}
   <div ref={graphSurface} className={`canvas-content ${state.view==='list'?'show-list':''}`}>
    {detailCollapsed&&(current||selectedEdge||selectedBundle||browseBundles)&&<button className="reopen-detail" onClick={()=>setDetailCollapsed(false)}><BookOpen size={16}/> {msg("Read selected idea")}</button>}
    <div className={`tower-surface overview-${detailLevel}`} hidden={state.view!=='tower'}><ReactFlow nodes={nodes} edges={noEdges} nodeTypes={nodeTypes} onInit={()=>setInitialized(true)} onPaneClick={()=>{setSearchOpen(false);setEdgeId('');}} minZoom={.02} maxZoom={1.5} onlyRenderVisibleElements nodesDraggable={false} nodesConnectable={false} edgesReconnectable={false} deleteKeyCode={null} selectionKeyCode={null} paneClickDistance={6} panOnScroll zoomOnDoubleClick={false} proOptions={{hideAttribution:false}} ariaLabelConfig={ariaLabelConfig}>
    <ConnectionsLayer edges={edges}/>
    </ReactFlow>
    <BranchRuler onNavigate={navigateBranch} level={detailLevel}/><EraRuler layout={layout} onNavigate={chooseEra}/>
    <PillarTooltip surface={graphSurface}/>
    {benchmarkEnabled&&<MotionBenchmark labels={{title:msg("Local motion benchmark"),run:msg("Run motion benchmark"),measuring:msg("Measuring…")}} center={{x:0,y:layout.bands.find(b=>b.id==='modern')!.top+1600}}/>}
    <TowerOverview visible={filtered.visible} selected={state.concept}/>
    {state.connections==='focus'&&!current&&<div className="focus-hint">{msg("Select an idea to reveal its connections.")}</div>}
    {current&&<button className="trace-summary" onClick={()=>fitView({includeHiddenNodes:true,nodes:[...filtered.highlight].map(id=>({id})),padding:.15,duration:motionDuration(300)})}><GitBranch size={14}/>{state.trace==='ancestors'?msg("{count} origins highlighted",{count:filtered.highlight.size-1}):state.trace==='descendants'?msg("{count} descendants highlighted",{count:filtered.highlight.size-1}):msg("{count} connected ideas highlighted",{count:filtered.highlight.size-1})}<Maximize size={13}/><span>{msg("Fit path")}</span></button>}
    {!current&&!state.era&&showCaption&&!navigationTarget.current&&<div className="canvas-caption"><span className="eyebrow">{msg("EVERY DISCOVERY HAS A HISTORY")}</span><h2>{msg("Begin at the roots.")}<br/><em>{msg("See how ideas rise.")}</em></h2><p>{msg("Select an idea to uncover what came before")}<br/>{msg("and everything it made possible.")}</p><button onClick={()=>{setActiveTab('journeys');if(window.innerWidth<760)setMobileNav(true);}}>{msg("Take a guided journey")}<ArrowRight size={15}/></button></div>}
    <div className="canvas-controls"><button onClick={()=>zoomIn({duration:motionDuration(200)})} aria-label={msg("Zoom in")}><Plus size={17}/></button><button onClick={()=>zoomOut({duration:motionDuration(200)})} aria-label={msg("Zoom out")}><Minus size={17}/></button><span/><button onClick={()=>fitView({includeHiddenNodes:true,nodes:atlas.concepts.filter(c=>filtered.visible.has(c.id)).map(c=>({id:c.id})),padding:.12,duration:motionDuration(500)})} aria-label={msg("View entire tower")} title={msg("View entire tower")}><Maximize size={16}/></button><button onClick={reset} aria-label={msg("Return to foundations and reset filters")} title={msg("Return to foundations")}><RotateCcw size={16}/></button></div>
    <div className="map-note"><ArrowUp size={12}/><span>{msg("Later ideas rise upward")}</span><i/>{msg("Time is compressed")}</div>
    {filtered.matching.size===0&&<div className="empty-state"><Compass size={28}/><h3>{msg("No ideas match these filters.")}</h3><p>{msg("Try a different era or clear your filters.")}</p><button onClick={()=>change({disciplines:[],branches:[],era:'',standing:''})}>{msg("Clear filters")}</button></div>}
    </div>{state.view==='list'&&<div className="concept-index"><div className="index-heading"><span className="eyebrow">{msg("THE CHRONOLOGICAL INDEX")}</span><h2>{msg("A history, one idea at a time.")}</h2><p>{msg("Every concept and connection, in an accessible reading view.")}</p></div>{eras.map(era=>{const items=atlas.concepts.filter(c=>filtered.visible.has(c.id)&&eraFor(c.date.year).id===era.id).sort((a,b)=>a.date.year-b.date.year||a.title.localeCompare(b.title));return items.length?<section key={era.id}><h3>{era.label}<small>{era.range}</small></h3>{items.map(c=><button className={`index-item ${current?.id===c.id?'active':''}`} key={c.id} onClick={()=>goTo(c.id)}><time>{c.date.label}</time><span className="color-dot" style={{background:disciplines[c.discipline].color}}/><div><strong>{c.title}{pillarIds.has(c.id)&&<Columns3 size={13}/>}</strong><p className={state.display==='formal'&&c.representation?`index-representation ${c.representation.kind}`:undefined}>{state.display==='formal'&&c.representation?<Expression text={c.representation.expression}/>:c.summary}</p></div><ArrowUpRight size={17}/></button>)}</section>:null;})}{filtered.matching.size===0&&<div className="index-empty"><p>{msg("No ideas match these filters.")}</p><button onClick={()=>change({disciplines:[],branches:[],era:'',standing:''})}>{msg("Clear filters")}</button></div>}</div>}
   </div>
   {currentTour&&step&&<div className="tour-player"><div className="tour-player-top"><span><GitBranch size={14}/>{currentTour.title}</span><button aria-label={msg("Exit guided journey")} onClick={()=>change({tour:'',step:0})}><X size={16}/></button></div><p>{step.narration}</p><div className="tour-player-bottom"><button disabled={state.step===0} onClick={()=>tourStep(currentTour.id,state.step-1)} aria-label={msg("Previous tour stop")}><ArrowLeft size={16}/></button><span>{state.step+1} <i>/</i> {currentTour.steps.length}</span><div className="tour-progress">{currentTour.steps.map((s,i)=><button key={`${s.conceptId}-${i}`} className={i===state.step?'active':''} aria-label={msg("Tour stop {v0}",{v0:i+1})} aria-current={i===state.step?'step':undefined} onClick={()=>tourStep(currentTour.id,i)}/>)}</div>{state.step<currentTour.steps.length-1?<button onClick={()=>tourStep(currentTour.id,state.step+1)} aria-label={msg("Next tour stop")}><ArrowRight size={16}/></button>:<button onClick={()=>{change({tour:'',step:0});setActiveTab('journeys');}} aria-label={msg("Complete journey")}><Check size={16}/></button>}</div></div>}
  </main>
  {(current||selectedEdge||selectedBundle||browseBundles)&&!detailCollapsed&&<aside className="detail-panel" aria-label={selectedEdge||selectedBundle||browseBundles?msg("Connection details"):msg("Concept details")}><div className="detail-tools"><span>{selectedBundle||browseBundles?msg("CONNECTION BUNDLES"):selectedEdge?msg("THE CONNECTION"):msg("THE IDEA & ITS ORIGINS")}</span><button onClick={copyLink} aria-label={msg("Copy link to current view")}>{copied?<Check size={16}/>:<Link2 size={16}/>}</button><button onClick={()=>{if(window.innerWidth<760){setDetailCollapsed(true);return;}setEdgeId('');setBrowseBundles(false);if(!selectedEdge&&!selectedBundle&&!browseBundles)change({concept:'',tour:'',trace:'neighbors'});}} aria-label={msg("Close detail panel")}><X size={18}/></button></div>{browseBundles?<div className="detail-scroll"><span className="eyebrow">{msg("GROUPS, NOT NEW RELATIONSHIPS")}</span><h2>{msg("Connections across the tower")}</h2><p>{msg("Counts reflect your filters. Open a group to read every cited relationship.")}</p>{visibleBundles(bundleCatalog,filtered.edges,bundleLevel).map(b=><button className="bundle-list-button" key={b.id} onClick={()=>selectConnection(b.id,b.memberIds)}><strong>{groupLabel(b.sourceGroup)} → {groupLabel(b.targetGroup)}</strong><small>{eras.find(e=>e.id===b.sourceEra)?.short} → {eras.find(e=>e.id===b.targetEra)?.short} · {relations[b.type].label} · {evidenceLabel(b.evidence)}</small><span>{b.memberIds.length}</span></button>)}{!filtered.edges.length&&<p>{msg("No connections match these filters.")}</p>}</div>:selectedBundle?<BundleDetail bundle={selectedBundle} edges={matchingBundleEdges} onSelect={goTo} onExpand={expandBundle}/>:selectedEdge?<EdgeDetail edge={selectedEdge} onSelect={goTo}/>:current&&<ConceptDetail concept={current} state={state} change={patch=>{change(patch);if(patch.trace&&window.innerWidth<760)setDetailCollapsed(true);}} onSelect={goTo}/>}</aside>}

  </div>
  {methodology&&<Methodology onClose={()=>setMethodology(false)}/>}
 </div>;
}
function Citations({ids}:{ids:string[]}){
 const {msg}=useLocale();return <span className="citations">{ids.map(id=>{const s=sourceIndex.get(id);return s?<a key={id} href={s.url} target="_blank" rel="noreferrer" title={`${s.title} — ${s.publisher}`} aria-label={msg("Source: {v0}",{v0:s.title})}><ExternalLink size={11}/></a>:null;})}</span>}
function SourceList({ids}:{ids:string[]}){return <ol className="source-list">{[...new Set(ids)].map(id=>{const s=sourceIndex.get(id);return s?<li key={id}><a href={s.url} target="_blank" rel="noreferrer"><strong>{s.title}<ArrowUpRight size={13}/></strong><small>{s.publisher}</small></a></li>:null;})}</ol>}
function ConceptDetail({concept:c,state,change,onSelect}:{concept:Concept;state:ViewState;change:(p:Partial<ViewState>)=>void;onSelect:(id:string)=>void}){
 const {msg,locale,atlas,index,disciplines,relations,standings,branchIndex,kindLabel}=useLocale();
 const d=disciplines[c.discipline],parents=index.incoming.get(c.id)??[],children=index.outgoing.get(c.id)??[];
 const connectionList=(edges:Relationship[],parent:boolean)=><div className="connection-list">{edges.map(e=>{const other=index.byId.get(parent?e.source:e.target)!;return <div key={e.id}><button onClick={()=>onSelect(other.id)}><span className="color-dot" style={{background:disciplines[other.discipline].color}}/><span><strong>{other.title}</strong><small>{relations[e.type].label}</small></span><ArrowUpRight size={14}/></button><details><summary>{msg("Why they connect")}{e.evidence!=='documented'&&<small>{e.evidence==='conceptual'?msg("Conceptual link"):msg("Contested")}</small>}</summary><p>{e.explanation}<Citations ids={e.sourceIds}/></p></details></div>;})}</div>;
 return <div className="detail-scroll" key={c.id}><div className="detail-identity"><span className="discipline-label" style={{color:d.color}}>{d.symbol} {d.label}</span><div className="branch-label">{branchIndex.get(c.branchId)?.label}</div><h2>{c.title}</h2>{locale==='zh-CN'&&<p className="original-title" lang="en">{englishConceptTitle(c.id)}</p>}{!!c.relatedBranchIds?.length&&<p className="related-branches">{msg("Also connects with {branches}",{branches:c.relatedBranchIds.map(id=>branchIndex.get(id)?.label).join(' · ')})}</p>}<div className="detail-date">{c.date.label}<span>·</span>{kindLabel(c.kind)}</div><span className={`standing standing-${c.standing}`}>{standings[c.standing]}</span>{pillarIds.has(c.id)&&<div className="pillar-banner"><Columns3 size={22}/><div><strong>{msg("A pillar of the tower")}</strong><span>{msg("{direct} direct · {total} total descendants",{direct:index.direct(c.id),total:index.walk(c.id,'outgoing').size})}</span></div></div>}<DisplaySwitch value={state.display} onChange={display=>change({display})} label={msg("Selected idea content display")}/>{state.display==='formal'&&c.representation?<RepresentationDetail concept={c}/>:<><p className="lead">{c.summary}<Citations ids={c.claimSources.summary}/></p>{state.display==='formal'&&<p className="formal-fallback">{msg("This idea is explained in words; no concise formal representation is included.")}</p>}</>}</div>
  <div className="trace-actions"><button className={state.trace==='ancestors'?'active':''} onClick={()=>change({trace:state.trace==='ancestors'?'neighbors':'ancestors'})}><ArrowDown size={16}/><span>{msg("Trace origins")}</span></button><button className={state.trace==='descendants'?'active':''} onClick={()=>change({trace:state.trace==='descendants'?'neighbors':'descendants'})}><ArrowUp size={16}/><span>{msg("Follow influence")}</span></button></div>
  {c.historicalSetting&&<section><h3>{msg("Historical setting")}</h3><p>{c.historicalSetting}</p></section>}<section><h3>{msg("The question it answered")}</h3><p>{c.problem}</p></section><section><h3>{msg("How the idea took shape")}</h3><p>{c.development}<Citations ids={c.claimSources.history}/></p>{c.date.note&&<div className="date-note"><Info size={13}/><span>{c.date.note}</span></div>}</section>
  <section><h3>{msg("The minds behind it")}</h3><div className="contributors">{c.contributors.map(p=><div key={p.name}><span className="person-mark">{locale==='zh-CN'?p.name.replace(/（.*$/, '').replace(/[·\s]/g,'').slice(0,2):p.name.split(' ').filter(Boolean).map(v=>v[0]).slice(0,2).join('')}</span><span><strong>{p.name}</strong><small>{p.role}</small></span></div>)}</div></section>
  {state.display==='language'&&c.representation&&<details className="notation-reference"><summary>{msg("View representative {kind}",{kind:kindLabel(c.representation.kind)})}</summary><RepresentationDetail concept={c}/></details>}{c.example&&<section className="example"><span className="eyebrow">{msg("MAKE IT CONCRETE")}</span><p>{c.example}</p></section>}
  <section><h3>{msg("What came before")}<span>{parents.length}</span></h3>{parents.length?connectionList(parents,true):<p className="muted">{msg("A root in this curated atlas. This does not mean it developed without earlier practical knowledge.")}</p>}</section>
  <section><h3>{msg("What it made possible")}<span>{children.length}</span></h3>{children.length?connectionList(children,false):<p className="muted">{msg("No subsequent connections are included in this edition.")}</p>}</section>
  <section><h3>{msg("Where it stands today")}</h3><p>{c.limitations}<Citations ids={c.sourceIds}/></p></section><section><h3>{msg("Explore the evidence")}</h3><SourceList ids={[...c.sourceIds,...(c.representation?.sourceIds??[])]}/></section><footer className="review-note">{msg("Content reviewed {date} · Edition {version}",{date:atlas.reviewedAt,version:atlas.version})}<br/>{msg("Dates mark selected milestones, not a single moment of invention.")}</footer>
 </div>;
}
function EdgeDetail({edge:e,onSelect}:{edge:Relationship;onSelect:(id:string)=>void}){
 const {msg,index,relations}=useLocale();return <div className="detail-scroll edge-detail"><span className="eyebrow">{relations[e.type].label}</span><button className="edge-endpoint" onClick={()=>onSelect(e.source)}>{index.byId.get(e.source)?.title}<ArrowUpRight size={16}/></button><ArrowDown size={24}/><button className="edge-endpoint" onClick={()=>onSelect(e.target)}>{index.byId.get(e.target)?.title}<ArrowUpRight size={16}/></button><span className="standing">{e.evidence==='conceptual'?msg("Editorial conceptual connection"):e.evidence==='contested'?msg("Contested connection"):msg("Documented connection")}</span><p>{e.explanation}</p>{e.evidence==='conceptual'&&<p className="date-note">{msg("This link explains an intellectual dependency. It is not a claim that one contributor directly learned from another.")}</p>}<h3>{msg("Supporting evidence")}</h3><SourceList ids={e.sourceIds}/></div>}
function BundleDetail({bundle:b,edges,onSelect,onExpand}:{bundle:Bundle;edges:Relationship[];onSelect:(id:string)=>void;onExpand:()=>void}){
 const {msg,index,relations,eras,groupLabel,evidenceLabel}=useLocale();
 return <div className="detail-scroll bundle-detail"><span className="eyebrow">{msg("{count} cited relationships",{count:edges.length})}</span><h2>{groupLabel(b.sourceGroup)} → {groupLabel(b.targetGroup)}</h2><p>{eras.find(e=>e.id===b.sourceEra)?.label} → {eras.find(e=>e.id===b.targetEra)?.label}</p><span className="standing">{relations[b.type].label} · {evidenceLabel(b.evidence)}</span><p>{msg("A display group of distinct connections. Its path represents the group; it is not an additional claim of derivation.")}</p><button className="expand-bundle" disabled={!edges.length} onClick={onExpand}><GitBranch size={16}/> {msg("Expand these connections")}</button>{edges.map(e=><article key={e.id}><button onClick={()=>onSelect(e.source)}>{index.byId.get(e.source)?.title} <ArrowUpRight size={13}/></button><ArrowDown size={15}/><button onClick={()=>onSelect(e.target)}>{index.byId.get(e.target)?.title} <ArrowUpRight size={13}/></button><p>{e.explanation}<Citations ids={e.sourceIds}/></p><SourceList ids={e.sourceIds}/></article>)}{!edges.length&&<p>{msg("This group has no visible relationships under the current filters.")}</p>}</div>;
}
function Methodology({onClose}:{onClose:()=>void}){
 const {msg,atlas,relations}=useLocale();
 const closeRef=useRef<HTMLButtonElement>(null),dialogRef=useRef<HTMLDivElement>(null);
 useEffect(()=>{const previous=document.activeElement as HTMLElement;closeRef.current?.focus();return()=>previous?.focus();},[]);
 const trap=(e:React.KeyboardEvent)=>{if(e.key!=='Tab')return;const items=dialogRef.current?.querySelectorAll<HTMLElement>('button,a[href]');if(!items?.length)return;const first=items[0],last=items[items.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}};
 return <div className="modal-backdrop" onClick={onClose}><div className="methodology-modal" role="dialog" aria-modal="true" aria-labelledby="method-title" ref={dialogRef} onKeyDown={trap} onClick={e=>e.stopPropagation()}><button className="modal-close icon-button" ref={closeRef} onClick={onClose} aria-label={msg("Close about the atlas")}><X size={21}/></button><Logo/><span className="eyebrow">{msg("A NOTE FROM THE ATLAS")}</span><h2 id="method-title">{msg("Knowledge is a conversation")}<br/><em>{msg("across centuries.")}</em></h2><p className="lead">{msg("The Tower of Science maps how ideas build on, challenge, and transform one another. It is a curated guide to scientific development, not a complete family tree of human knowledge.")}</p><div className="method-stats"><span><strong>{atlas.concepts.length}</strong>{msg("Ideas")}</span><span><strong>{atlas.relationships.length}</strong>{msg("Connections")}</span><span><strong>{atlas.tours.length}</strong>{msg("Journeys")}</span></div>
  <section><h3>{msg("Reading the tower")}</h3><p>{msg("Earlier milestones sit lower; later ones sit higher. Approximate contemporaries share period floors, with exact dates preserved in the index. Cards are centered within their subbranch cells. Science sections reserve separate horizontal regions within each era and expand to accommodate their busiest floor. The shape stays fixed when filtering. At far zoom, inactive branches become named summaries within their eras. Labels retain a readable size and may shift to avoid collisions; the underlying concept positions do not move. Selecting a branch name reveals its concepts while keeping your current selection and filters. Summary connections group the same cited relationships and do not create new historical claims. Time is compressed, and spacing is not a measure of importance or difficulty. Multiple roots acknowledge that counting, observation, craft, and practical knowledge arose in many communities. Unrecorded contributions cannot be reconstructed with certainty.")}</p></section>
  <section><h3>{msg("Four kinds of connection")}</h3><div className="method-relations">{Object.entries(relations).map(([id,r])=><div key={id}><svg width="40" height="16"><path d="M1 8h34" stroke="#386454" strokeWidth="2" strokeDasharray={r.dash}/><path d="m30 4 5 4-5 4" fill="none" stroke="#386454"/></svg><span><strong>{r.label}</strong><small>{r.definition}</small></span></div>)}</div><p>{msg("Documented connections are supported by the cited accounts. Conceptual connections are editorial interpretations of prerequisites, not evidence of historical transmission. Contested links identify uncertainty. The graph represents development without claiming that history was inevitable.")}</p></section>
  <section><h3>{msg("Sections, floors, and connection bundles")}</h3><p>{msg("Modern branches are navigational categories applied retrospectively, not claims about how historical communities divided knowledge. Each idea has one primary location; related branches identify interdisciplinary associations. Empty periods are omitted. Floors span prehistory, 500 years from 5000–500 BCE, 100 years to 1500, 25 years to 1850, 10 years to 1900, and five years afterward, split at era boundaries.")}</p><p>{msg("Bundled mode groups existing connections by section (or subbranch at closer zoom), era pair, relationship type, and evidence classification. Counts include distinct relationships after filters. Selected ideas show their immediate connections individually. Open a bundle to inspect its complete evidence or expand its members. Focus only hides background links; All connections draws each relationship. Bundles do not affect ancestry, pillar counts, or scientific standing.")}</p></section>
  <section><h3>{msg("What makes a pillar?")}</h3><p>{msg("A pillar has five or more distinct, supported direct descendants in this edition. Documented and explicitly identified conceptual links count; contested links do not. Total descendants include indirect paths, counted once per concept. These are properties of this collection, not universal rankings of scientific value.")}</p></section>
  <section><h3>{msg("Dates, credit, and scientific standing")}</h3><p>{msg("Dates usually identify a publication, formulation, observation, or surviving record. Approximate dates and disputed priority are explained inside entries. Credit includes named contributors and collective traditions. Superseded models remain visible for their historical role; useful approximations retain their domains of validity. Open questions and speculative proposals carry explicit labels.")}</p></section>
  <section><h3>{msg("Sources and editorial approach")}</h3><p>{msg("Entries cite scholarly histories, original research, textbooks, museums, and scientific institutions. Citations beside the introduction and history link claims to their supporting sources. Edge citations support the stated relationship or the ingredients of a conceptual inference. Guided tours are narratives through the atlas; consecutive stops do not imply a direct derivation.")}</p><p>{msg("Coverage includes natural and formal sciences and selected social sciences. The collection is an introductory, source-linked synthesis, not a substitute for specialist historical review. Its sources and interpretations can be revised as evidence improves.")}</p></section>
  <footer className="review-note">{msg("Edition {version} · Content reviewed {date}",{date:atlas.reviewedAt,version:atlas.version})}<br/>{msg("Built for exploration, curiosity, and a closer look.")}</footer>
 </div></div>;
}
export default App;
