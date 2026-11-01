import {useEffect,useRef} from 'react';
import {useStoreApi,type Edge} from '@xyflow/react';
import type {Route} from './graph';

/** Cache inactive ink during gestures; the SVG remains the accessible, interactive source at rest.
 * Selected paths stay vector-rendered. The bitmap is only a temporary presentation surface. */
export function MotionConnections({edges}:{edges:Edge[]}){
 const canvas=useRef<HTMLCanvasElement>(null),latest=useRef(edges),refresh=useRef<()=>void>(()=>{}),store=useStoreApi();
 latest.current=edges;
 useEffect(()=>refresh.current(),[edges]);
 useEffect(()=>{
  const element=canvas.current!,root=element.closest('.react-flow')!;
  let timer=0,frame=0,moving=false,bounds:{left:number;top:number;right:number;bottom:number;zoom:number}|null=null;
  const paths=new WeakMap<Route,Path2D>();
  const preciseStrokes=()=>{const zoom=store.getState().transform[2],svg=root.querySelector<SVGElement>('.connection-canvas');svg?.style.setProperty('--edge-zoom',String(1/zoom));for(const path of svg?.querySelectorAll<SVGElement>('.react-flow__edge-path,.react-flow__edge-interaction')??[])if(path.style.getPropertyValue('--edge-zoom'))path.style.removeProperty('--edge-zoom');for(const marker of svg?.querySelectorAll('marker')??[]){marker.setAttribute('markerWidth',String(7/zoom));marker.setAttribute('markerHeight',String(7/zoom));}};
  const draw=()=>{
   frame=0;if(!moving)return;
   const {transform:[x,y,zoom],width,height}=store.getState(),margin=320,dpr=Math.min(2,window.devicePixelRatio||1);
   const left=(-x-margin)/zoom,top=(-y-margin)/zoom,w=width+margin*2,h=height+margin*2;
   element.width=Math.ceil(w*dpr);element.height=Math.ceil(h*dpr);
   Object.assign(element.style,{left:`${left}px`,top:`${top}px`,width:`${w/zoom}px`,height:`${h/zoom}px`,display:'block'});
   const context=element.getContext('2d')!;context.setTransform(dpr*zoom,0,0,dpr*zoom,-left*dpr*zoom,-top*dpr*zoom);
   for(const edge of latest.current){
    if(edge.selected||edge.style?.stroke==='#386454')continue;
    const route=edge.data?.route as Route|undefined;if(!route)continue;
    let path=paths.get(route);if(!path){path=new Path2D(route.path);paths.set(route,path);}
    context.strokeStyle=String(edge.style?.stroke??'#849488');context.globalAlpha=Number(edge.style?.opacity??.3)*(zoom<.16?.6:1);
    context.lineWidth=Number(edge.style?.strokeWidth??1)/zoom;context.lineJoin='round';
    context.setLineDash(String(edge.style?.strokeDasharray??'').split(/[ ,]+/).map(Number).filter(v=>v>0).map(v=>v/zoom));
    context.stroke(path);
    const b=route.points.at(-1)!,a=route.points.at(-2)!;const angle=Math.atan2(b.y-a.y,b.x-a.x),size=6/zoom;
    context.fillStyle=context.strokeStyle;context.beginPath();context.moveTo(b.x,b.y);
    context.lineTo(b.x-size*Math.cos(angle-.45),b.y-size*Math.sin(angle-.45));context.lineTo(b.x-size*Math.cos(angle+.45),b.y-size*Math.sin(angle+.45));context.closePath();context.fill();
   }
   bounds={left,top,right:left+w/zoom,bottom:top+h/zoom,zoom};root.classList.add('motion-raster');
  };
  const request=()=>{if(!frame)frame=requestAnimationFrame(draw);};refresh.current=request;
  const unsubscribe=store.subscribe((state,old)=>{
   if(state.transform===old.transform&&state.width===old.width&&state.height===old.height)return;
   const [x,y,z]=state.transform;
   moving=true;
   if(!bounds||z/bounds.zoom>2||z/bounds.zoom<.5||-x/z<bounds.left||-y/z<bounds.top||(state.width-x)/z>bounds.right||(state.height-y)/z>bounds.bottom)request();
   window.clearTimeout(timer);timer=window.setTimeout(()=>{moving=false;bounds=null;preciseStrokes();element.style.display='none';root.classList.remove('motion-raster');},120);
  });
  preciseStrokes();
  return()=>{refresh.current=()=>{};unsubscribe();cancelAnimationFrame(frame);window.clearTimeout(timer);root.classList.remove('motion-raster');};
 },[store]);
 return <canvas ref={canvas} className="motion-connections" aria-hidden="true"/>;
}
