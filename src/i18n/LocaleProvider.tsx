import {createContext,useContext,useLayoutEffect,useMemo,type ReactNode} from 'react';
import {presentations} from './content';
import {translate,type MessageKey} from './messages';
import type {Locale} from './language';
import type {Floor} from '../graph';
import type {Concept,Relationship,Representation} from '../types';
import {chineseAriaLabels} from './accessibility';

const kindNames:Record<Concept['kind']|Representation['kind'],string>={concept:'概念',theory:'理论',method:'方法',discovery:'发现',mathematics:'数学',instrument:'仪器',formula:'公式',definition:'定义'};
const evidenceNames:Record<Relationship['evidence'],string>={documented:'有文献依据',conceptual:'概念性联系',contested:'存在争议'};
export function formatPeriod(locale:Locale,floor:Pick<Floor,'year'|'end'|'label'>){
 if(locale==='en')return floor.label;
 if(floor.year===-Infinity)return '公元前5000年以前';
 const year=(n:number)=>n<0?`公元前${Math.abs(n)}年`:`公元${n}年`;
 return `${year(floor.year===0?1:floor.year)}—${year(floor.end-1===0?-1:floor.end-1)}`;
}
function createLocale(locale:Locale){return {...presentations[locale],locale,
 ariaLabelConfig:locale==='zh-CN'?chineseAriaLabels:{'edge.a11yDescription.default':'Press Enter to read this connection.','controls.zoomIn.ariaLabel':'Zoom in','controls.zoomOut.ariaLabel':'Zoom out'},
 msg:(key:MessageKey,values?:Record<string,string|number>)=>translate(locale,key,values),
 formatPeriod:(floor:Pick<Floor,'year'|'end'|'label'>)=>formatPeriod(locale,floor),
 kindLabel:(kind:Concept['kind']|Representation['kind'])=>locale==='zh-CN'?kindNames[kind]:kind,
 evidenceLabel:(evidence:Relationship['evidence'])=>locale==='zh-CN'?evidenceNames[evidence]:evidence
};}
const LocaleContext=createContext(createLocale('en'));
export function LocaleProvider({locale,children}:{locale:Locale;children:ReactNode}){
 const value=useMemo(()=>createLocale(locale),[locale]);
 useLayoutEffect(()=>{
  document.documentElement.lang=locale;
  document.title=value.msg('Tower of Science — An atlas of connected ideas');
  document.querySelector('meta[name="description"]')?.setAttribute('content',value.msg('Climb through the connected history of scientific ideas. An interactive, sourced atlas from counting to contemporary science.'));
 },[locale,value]);
 return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}
export const useLocale=()=>useContext(LocaleContext);
