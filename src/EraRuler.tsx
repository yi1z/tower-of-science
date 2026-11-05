import {useStore} from '@xyflow/react';
import {useLocale} from './i18n/LocaleProvider';
import type {Layout} from './graph';
import {placeEraTags,ERA_TAG_HEIGHT} from './eraTags';

export function EraRuler({layout,onNavigate}:{layout:Layout;onNavigate:(id:string)=>void}){
 const {msg,eras}=useLocale();
 const transform=useStore(s=>s.transform),height=useStore(s=>s.height);
 if(transform[2]>=.25)return null;
 const top=40,bottom=4,available=Math.max(0,height-top-bottom);
 const anchors=layout.bands.flatMap(b=>{
  const start=b.top*transform[2]+transform[1]-top,end=b.bottom*transform[2]+transform[1]-top;
  return start<available&&end>0?[{id:b.id,y:Math.max(0,Math.min(available,(start+end)/2))}]:[];
 }).reverse();
 if(!anchors.length||!available)return null;
 const {positions,trackHeight}=placeEraTags(anchors.map(a=>a.y),available);
 return <nav className="era-ruler nowheel" data-scrollable={trackHeight>available}
  aria-label={msg("Era markers on the tower")} style={{top,bottom}}>
  <div className="era-tag-track" style={{height:trackHeight}}>
   <svg className="era-tag-leaders" aria-hidden="true" width="9" height={trackHeight}>
    {anchors.map(({id,y},i)=>Math.abs(positions[i]-y)>2&&<path key={id} d={`M 1 ${y} L 8 ${positions[i]}`}/>)}
   </svg>
   {anchors.map(({id},i)=>{
    const era=eras.find(e=>e.id===id)!;
    return <button key={id} title={era.label} style={{top:positions[i],height:ERA_TAG_HEIGHT}} onClick={()=>onNavigate(id)}>
     <strong>{era.short}</strong><small>{era.range}</small>
    </button>;
   })}
  </div>
 </nav>;
}
