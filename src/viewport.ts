import {useEffect,useMemo,useState,type RefObject} from 'react';
import {useStoreApi} from '@xyflow/react';
import {fitPillarTitle,summaryLevel,type BranchSummary,type SummaryLevel} from './overview';

export class PillarLabels {
 private zoom=1;
 private entries=new Map<HTMLElement,{summary:BranchSummary;width:number;font:number}>();
 private widths=new Map<string,number>();
 private context:CanvasRenderingContext2D|null=null;
 register(element:HTMLElement,summary:BranchSummary){
  const font=summary.level==='section'?23:18,text=element.querySelector('strong')!.textContent!;
  const key=`${font}:${text}`;
  if(!this.widths.has(key)){
   this.context??=document.createElement('canvas').getContext('2d');
   if(this.context)this.context.font=`${font}px "Libre Caslon Display", Georgia, serif`;
   this.widths.set(key,(this.context?.measureText(text).width??text.length*font*.55)+text.length*.3+2);
  }
  this.entries.set(element,{summary,width:this.widths.get(key)!,font});this.draw(element);
  return()=>{this.entries.delete(element);};
 }
 refreshFonts(){this.widths.clear();const entries=[...this.entries];for(const [element,{summary}] of entries)this.register(element,summary);}
 update(zoom:number){if(this.zoom===zoom)return;this.zoom=zoom;for(const element of this.entries.keys())this.draw(element);}
 private draw(element:HTMLElement){
  const {summary,width,font}=this.entries.get(element)!;
  const fit=fitPillarTitle(summary.width,summary.height,this.zoom,width,font);
  element.style.transform=`translate(-50%,-50%) rotate(${fit.rotated?-90:0}deg) scale(${fit.scale/this.zoom})`;
  element.dataset.rotated=String(fit.rotated);element.dataset.count=String(fit.showCount);
 }
}

/** Camera transforms never enter the graph's React dependency tree. */
export function useViewportPresentation(surface:RefObject<HTMLDivElement|null>){
 const store=useStoreApi(),labels=useMemo(()=>new PillarLabels(),[]);
 const [level,setLevel]=useState<SummaryLevel>('cards');
 useEffect(()=>{
  let frame=0,previous:SummaryLevel='cards',lastZoom=-1,disposed=false;
  const draw=()=>{
   frame=0;const zoom=store.getState().transform[2];if(zoom===lastZoom)return;lastZoom=zoom;
   const root=surface.current;if(!root)return;
   // Avoid inherited CSS variables: they invalidate every descendant's styles on every tick.
   for(const label of root.querySelectorAll<HTMLElement>('.bundle-count'))label.style.setProperty('--label-scale',String(1/zoom));
   const detail=zoom<.32?'far':zoom<.9?'medium':'near',small=String(zoom<.16);
   if(root.dataset.cardDetail!==detail)root.dataset.cardDetail=detail;if(root.dataset.smallScale!==small)root.dataset.smallScale=small;
   for(const path of root.querySelectorAll<SVGElement>('.connection-canvas .active path,.connection-canvas .selected path'))path.style.setProperty('--edge-zoom',String(1/zoom));
   labels.update(zoom);const next=summaryLevel(zoom,previous);if(next!==previous){previous=next;setLevel(next);}
  };
  const unsubscribe=store.subscribe((state,old)=>{if(state.transform[2]!==old.transform[2]&&!frame)frame=requestAnimationFrame(draw);});
  draw();void document.fonts.ready.then(()=>{if(!disposed)labels.refreshFonts();});
  return()=>{disposed=true;unsubscribe();cancelAnimationFrame(frame);};
 },[store,surface,labels]);
 return {level,labels};
}
