import test from 'node:test';
import assert from 'node:assert/strict';
import {PillarLabels} from '../src/viewport';
import type {BranchSummary} from '../src/overview';

const summary:BranchSummary={id:'region:branch:modern:math-probability',groupId:'math-probability',eraId:'modern',discipline:'mathematics',level:'branch',memberIds:[],position:{x:0,y:0},anchor:{x:192,y:1500},width:384,height:3000};
function caption(){
 const style={transform:'',color:'teal',removeProperty(name:string){if(name==='transform'){const previous=this.transform;this.transform='';return previous;}return '';}};
 return {style,dataset:{unrelated:'preserved'} as Record<string,string>,querySelector:()=>({textContent:'∑ Probability & statistics'})} as unknown as HTMLElement;
}
function fontMeasurement(t:test.TestContext){
 const previous=Object.getOwnPropertyDescriptor(globalThis,'document');
 Object.defineProperty(globalThis,'document',{configurable:true,value:{createElement:()=>({getContext:()=>({font:'',measureText:(text:string)=>({width:text.length*10})})})}});
 t.after(()=>{if(previous)Object.defineProperty(globalThis,'document',previous);else Reflect.deleteProperty(globalThis,'document');});
}

test('pillar measurement caches by the actual language, text, and font family',t=>{
 const oldDocument=Object.getOwnPropertyDescriptor(globalThis,'document'),oldStyle=Object.getOwnPropertyDescriptor(globalThis,'getComputedStyle');
 let family='Georgia',text='Mathematics';const measured:string[]=[];
 const context={font:'',measureText(value:string){measured.push(`${this.font}:${value}`);return {width:value.length*20};}};
 Object.defineProperty(globalThis,'document',{configurable:true,value:{createElement:()=>({getContext:()=>context})}});
 Object.defineProperty(globalThis,'getComputedStyle',{configurable:true,value:()=>({fontFamily:family,fontWeight:'400'})});
 t.after(()=>{for(const [key,value] of [['document',oldDocument],['getComputedStyle',oldStyle]] as const){if(value)Object.defineProperty(globalThis,key,value);else Reflect.deleteProperty(globalThis,key);}});
 const element=caption();element.querySelector=(()=>({get textContent(){return text;}})) as typeof element.querySelector;
 const labels=new PillarLabels();labels.register(element,summary);labels.register(element,summary);assert.equal(measured.length,1);
 family='SimSun';labels.register(element,summary);assert.equal(measured.length,2);assert.match(measured[1],/SimSun/);
 text='数学';labels.register(element,summary);assert.equal(measured.length,3);assert.match(measured[2],/数学/);
 labels.refreshFonts();assert.equal(measured.length,4);
});

test('leaving summary mode clears rotation and scale before an element can become a branch heading',t=>{
 fontMeasurement(t);
 const labels=new PillarLabels(),element=caption(),unregister=labels.register(element,summary);
 labels.update(.2);
 assert.equal(element.dataset.rotated,'true');assert.match(element.style.transform,/rotate\(-90deg\)/);
 unregister();
 assert.equal(element.style.transform,'');assert.equal(element.dataset.rotated,undefined);assert.equal(element.dataset.count,undefined);
 assert.equal(element.style.color,'teal');assert.equal(element.dataset.unrelated,'preserved');
 labels.update(.6);labels.refreshFonts();
 assert.equal(element.style.transform,'','zoom and delayed font refresh must leave normal headings untouched');
});

test('repeated summary registration uses the current zoom and cleanup leaves other captions active',t=>{
 fontMeasurement(t);
 const labels=new PillarLabels(),element=caption(),other=caption(),removeOther=labels.register(other,summary);
 for(const zoom of [.2,.55,.28,.95]){
  labels.update(zoom);
  const unregister=labels.register(element,summary),before=other.style.transform;
  assert.equal(element.style.transform,other.style.transform);
  labels.refreshFonts();unregister();labels.update(zoom+.01);
  assert.equal(element.style.transform,'');assert.notEqual(other.style.transform,before);
 }
 removeOther();assert.equal(other.style.transform,'');
});
