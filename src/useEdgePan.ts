import {useEffect,useRef} from 'react';
import {useReactFlow} from '@xyflow/react';
import {dragViewport,pinchViewport,type DragGesture,type PinchGesture,type TouchPoint} from './interaction';

/** Delegate edge and collapsed-pillar starts; ordinary background panning stays native. */
export function useEdgePan(){
 const surface=useRef<HTMLDivElement>(null);
 const {getViewport,setViewport}=useReactFlow();
 useEffect(()=>{
  const root=surface.current;if(!root)return;
  let gesture:DragGesture|null=null,pinch:PinchGesture|null=null,suppressClick=false,frame=0,pending:ReturnType<typeof dragViewport>=null;
  const flush=()=>{frame=0;if(pending){void setViewport(pending,{duration:0});pending=null;}};
  const pointers=new Map<number,TouchPoint>();
  let origin={x:0,y:0};
  const local=(event:PointerEvent)=>({x:event.clientX-origin.x,y:event.clientY-origin.y});
  const down=(event:PointerEvent)=>{
   if(!pointers.size){const rect=root.getBoundingClientRect();origin={x:rect.left,y:rect.top};}
   pointers.set(event.pointerId,local(event));
   if(pointers.size>1){
    if(gesture&&event.pointerType==='touch'&&pointers.size===2){
     const [a,b]=[...pointers.values()];pinch={viewport:getViewport(),midpoint:{x:(a.x+b.x)/2,y:(a.y+b.y)/2},distance:Math.hypot(a.x-b.x,a.y-b.y)};
     for(const id of pointers.keys())root.setPointerCapture(id);suppressClick=true;
    }
    gesture=null;cancelAnimationFrame(frame);frame=0;pending=null;return;
   }
   suppressClick=false;
   if(event.button!==0||!(event.target instanceof Element)||!event.target.closest('.react-flow__edge, .bundle-count, .collapsed-pillar'))return;
   if(event.target.closest('.collapsed-pillar'))event.stopPropagation();
   gesture={pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,viewport:getViewport(),dragging:false};
  };
  const move=(event:PointerEvent)=>{
   if(pointers.has(event.pointerId))pointers.set(event.pointerId,local(event));
   if(pinch&&pointers.size===2){const [a,b]=[...pointers.values()];pending=pinchViewport(pinch,a,b);event.preventDefault();event.stopPropagation();if(!frame)frame=requestAnimationFrame(flush);return;}
   if(!gesture||gesture.pointerId!==event.pointerId)return;
   const next=dragViewport(gesture,event.clientX,event.clientY);if(!next)return;
   if(!root.hasPointerCapture(event.pointerId))root.setPointerCapture(event.pointerId);
   event.preventDefault();event.stopPropagation();
   root.classList.add('edge-panning');pending=next;if(!frame)frame=requestAnimationFrame(flush);
  };
  const end=(event:PointerEvent)=>{
   pointers.delete(event.pointerId);
   if(pinch){pinch=null;suppressClick=true;cancelAnimationFrame(frame);flush();for(const id of pointers.keys())if(root.hasPointerCapture(id))root.releasePointerCapture(id);}

   if(gesture?.pointerId===event.pointerId){
    suppressClick=gesture.dragging;cancelAnimationFrame(frame);flush();
    if(root.hasPointerCapture(event.pointerId))root.releasePointerCapture(event.pointerId);
    gesture=null;
   }
   root.classList.remove('edge-panning');
  };
  const click=(event:MouseEvent)=>{if(suppressClick&&event.detail!==0){event.preventDefault();event.stopImmediatePropagation();suppressClick=false;}};
  const cancel=()=>{suppressClick=!!pinch||!!gesture?.dragging;pinch=null;gesture=null;cancelAnimationFrame(frame);frame=0;pending=null;for(const id of pointers.keys())if(root.hasPointerCapture(id))root.releasePointerCapture(id);pointers.clear();root.classList.remove('edge-panning');};
  const lost=(event:PointerEvent)=>{if(gesture?.pointerId===event.pointerId||pinch)cancel();};
  const touch=(event:TouchEvent)=>{if(gesture||pinch){event.preventDefault();event.stopPropagation();}};
  root.addEventListener('touchstart',touch,{capture:true,passive:false});root.addEventListener('touchmove',touch,{capture:true,passive:false});
  root.addEventListener('pointerdown',down,true);root.addEventListener('lostpointercapture',lost);
  window.addEventListener('pointermove',move,{capture:true,passive:false});
  window.addEventListener('pointerup',end,true);window.addEventListener('pointercancel',cancel,true);
  root.addEventListener('click',click,true);window.addEventListener('blur',cancel);
  return()=>{root.removeEventListener('touchstart',touch,true);root.removeEventListener('touchmove',touch,true);root.removeEventListener('pointerdown',down,true);root.removeEventListener('lostpointercapture',lost);window.removeEventListener('pointermove',move,true);window.removeEventListener('pointerup',end,true);window.removeEventListener('pointercancel',cancel,true);root.removeEventListener('click',click,true);window.removeEventListener('blur',cancel);cancel();};
 },[getViewport,setViewport]);
 return surface;
}
