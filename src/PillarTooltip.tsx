import {useEffect,useId,useRef,type RefObject} from 'react';
import {createPortal} from 'react-dom';
import {useStoreApi} from '@xyflow/react';

/** One screen-space label for all pillars. Hovering never updates the graph. */
export function PillarTooltip({surface}:{surface:RefObject<HTMLDivElement|null>}){
 const tooltip=useRef<HTMLDivElement>(null),id=useId(),store=useStoreApi();
 useEffect(()=>{
  const root=surface.current!,tip=tooltip.current!;
  let owner:HTMLElement|null=null,timer=0,hoverX=0,hoverY=0;
  const rotated=(el:HTMLElement)=>!!el.querySelector('.pillar-caption[data-rotated="true"]');
  const dismiss=()=>{
   window.clearTimeout(timer);observer.disconnect();
   owner?.removeAttribute('aria-describedby');owner=null;tip.hidden=true;
  };
  const observer=new MutationObserver(()=>{
   if(owner&&(!owner.isConnected||!rotated(owner)||owner.dataset.pillarTitle!==tip.textContent))dismiss();
  });
  const show=(el:HTMLElement,x:number,y:number)=>{
   if(!el.isConnected||!rotated(el)){dismiss();return;}
   tip.hidden=false;
   const margin=8,offset=14,rect=tip.getBoundingClientRect();
   tip.style.left=`${Math.max(margin,Math.min(x+offset,window.innerWidth-rect.width-margin))}px`;
   tip.style.top=`${Math.max(margin,Math.min(y+offset+rect.height+margin>window.innerHeight?y-offset-rect.height:y+offset,window.innerHeight-rect.height-margin))}px`;
   el.setAttribute('aria-describedby',id);
  };
  const find=(target:EventTarget|null)=>target instanceof Element?target.closest<HTMLElement>('.collapsed-pillar'):null;
  const start=(el:HTMLElement,x:number,y:number,delay:number)=>{
   dismiss();
   if(!rotated(el))return;
   owner=el;tip.textContent=el.dataset.pillarTitle??'';
   observer.observe(root,{subtree:true,childList:true,attributes:true,attributeFilter:['data-rotated','data-pillar-title']});
   if(delay){hoverX=x;hoverY=y;timer=window.setTimeout(()=>show(el,hoverX,hoverY),delay);}
   else show(el,x,y);
  };
  const enter=(e:PointerEvent)=>{
   const el=find(e.target);
   if(el&&e.pointerType==='mouse'&&!e.buttons&&find(e.relatedTarget)!==el)start(el,e.clientX,e.clientY,400);
  };
  const leave=(e:PointerEvent)=>{if(owner&&find(e.relatedTarget)!==owner)dismiss();};
  const move=(e:PointerEvent)=>{if(owner&&tip.hidden){hoverX=e.clientX;hoverY=e.clientY;}};
  const focus=(e:FocusEvent)=>{
   const el=find(e.target);
   if(!el?.matches(':focus-visible')||!rotated(el))return;
   const rect=el.querySelector('.pillar-caption')!.getBoundingClientRect();
   start(el,Math.max(0,rect.left),Math.max(0,rect.bottom),0);
  };
  const key=(e:KeyboardEvent)=>{if(e.key==='Escape')dismiss();};
  const unsubscribe=store.subscribe((s,old)=>{if(owner&&s.transform!==old.transform)dismiss();});
  root.addEventListener('pointerover',enter);root.addEventListener('pointerout',leave);
  root.addEventListener('pointermove',move,{passive:true});
  root.addEventListener('focusin',focus);root.addEventListener('focusout',dismiss);
  window.addEventListener('pointerdown',dismiss,true);window.addEventListener('keydown',key);
  window.addEventListener('resize',dismiss);window.addEventListener('blur',dismiss);
  return ()=>{
   dismiss();unsubscribe();root.removeEventListener('pointerover',enter);root.removeEventListener('pointerout',leave);
   root.removeEventListener('pointermove',move);
   root.removeEventListener('focusin',focus);root.removeEventListener('focusout',dismiss);
   window.removeEventListener('pointerdown',dismiss,true);window.removeEventListener('keydown',key);
   window.removeEventListener('resize',dismiss);window.removeEventListener('blur',dismiss);
  };
 },[id,store,surface]);
 return createPortal(<div ref={tooltip} id={id} role="tooltip" className="pillar-tooltip" hidden/>,document.body);
}
