import {useRef,useState} from 'react';
import {useReactFlow} from '@xyflow/react';

/** Opt-in local QA panel. No observers or counters run in ordinary atlas sessions. */
export const benchmarkEnabled=typeof window!=='undefined'&&new URLSearchParams(window.location.search).has('benchmark');
const counters:Record<string,number>={};
export function recordRender(name:string){if(benchmarkEnabled)counters[name]=(counters[name]??0)+1;}
export function MotionBenchmark({center,labels}:{center:{x:number;y:number};labels:{title:string;run:string;measuring:string}}){
 const {getViewport,setViewport}=useReactFlow(),[result,setResult]=useState(''),[running,setRunning]=useState(false),cancel=useRef(false);
 async function run(){
  setRunning(true);setResult('');cancel.current=false;
  const original=getViewport(),output=[];
  for(const [name,low,high] of [['cards',.65,.85],['subbranches',.17,.27],['sections',.045,.075]] as const){
   const element=document.querySelector('.react-flow')!,rect=element.getBoundingClientRect();
   await setViewport({x:rect.width/2-center.x*low,y:rect.height/2-center.y*low,zoom:low},{duration:0});
   await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
   await new Promise(resolve=>setTimeout(resolve,600));
   const frames:number[]=[],tasks:number[]=[];Object.keys(counters).forEach(k=>counters[k]=0);
   const observer=new PerformanceObserver(list=>list.getEntries().forEach(e=>tasks.push(e.duration)));
   observer.observe({type:'longtask'});
   await new Promise<void>(resolve=>{
    let start=0,last=0;
    const tick=(now:number)=>{
     if(!start){start=now;last=now;}
     else frames.push(now-last);
     last=now;const t=(now-start)/2400,zoom=low+(high-low)*(1-Math.cos(t*Math.PI*2))/2;
     void setViewport({x:rect.width/2-center.x*zoom+Math.sin(t*Math.PI*2)*150,y:rect.height/2-center.y*zoom+Math.sin(t*Math.PI*4)*70,zoom},{duration:0});
     if(t<1&&!cancel.current)requestAnimationFrame(tick);else resolve();
    };requestAnimationFrame(tick);
   });
   observer.disconnect();frames.sort((a,b)=>a-b);
   output.push({name,viewport:{width:rect.width,height:rect.height},validTiming:frames.length>=30&&!frames.some(ms=>ms>=900),throttledFrames:frames.filter(ms=>ms>=900).length,frames:frames.length,p50ms:+(frames[Math.floor(frames.length*.5)]??0).toFixed(1),p95ms:+(frames[Math.floor(frames.length*.95)]??0).toFixed(1),longTasks:tasks.length,maxTaskMs:+Math.max(0,...tasks).toFixed(1),renders:{...counters}});
  }
  await setViewport(original,{duration:0});setResult(JSON.stringify(output,null,2));setRunning(false);
 }
 return <details className="motion-benchmark" style={{position:'absolute',left:12,bottom:45,zIndex:50,background:'#fffdf4',padding:8,maxWidth:330,maxHeight:320,overflow:'auto',fontSize:12}}><summary>{labels.title}</summary><button disabled={running} onClick={run}>{labels.run}</button><pre data-benchmark-result>{running?labels.measuring:result}</pre></details>;
}
