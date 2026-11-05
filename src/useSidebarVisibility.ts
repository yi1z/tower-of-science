import {useLayoutEffect,useRef,useState,type RefObject} from 'react';
import {useReactFlow,type Viewport} from '@xyflow/react';

const preference='tower-of-science.sidebar-hidden';

export function useSidebarVisibility(surface:RefObject<HTMLDivElement|null>){
 const [hidden,setHidden]=useState(()=>{
  try{return localStorage.getItem(preference)==='true';}catch{return false;}
 });
 const {getViewport,setViewport}=useReactFlow();
 const before=useRef<{rect:DOMRect;camera:Viewport}|null>(null);
 function toggle(){
  const flow=surface.current?.querySelector('.react-flow');
  if(flow?.clientWidth)before.current={rect:flow.getBoundingClientRect(),camera:getViewport()};
  try{localStorage.setItem(preference,String(!hidden));}catch{/* Optional preference storage. */}
  setHidden(!hidden);
 }
 useLayoutEffect(()=>{
  const previous=before.current;before.current=null;
  const flow=surface.current?.querySelector('.react-flow');
  if(!flow||!previous)return;
  const rect=flow.getBoundingClientRect(),{camera}=previous;
  void setViewport({
   x:camera.x+(rect.width-previous.rect.width)/2,
   y:camera.y+(rect.height-previous.rect.height)/2,
   zoom:camera.zoom
  },{duration:0});
 },[hidden,setViewport,surface]);
 return {hidden,toggle};
}
