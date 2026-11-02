import en from './en.json';
import zh from './zh-CN.json';
import type {Locale} from './language';
export type MessageKey=keyof typeof en;
export const messages:Record<Locale,Record<MessageKey,string>>={en,'zh-CN':zh};
export function translate(locale:Locale,key:MessageKey,values:Record<string,string|number>={}){
 let text=messages[locale][key]??messages.en[key];
 if(locale==='en'&&values.count===1)text=text.replace(/\bideas\b/g,'idea').replace(/\borigins\b/g,'origin').replace(/\bdescendants\b/g,'descendant');
 return text.replace(/\{(\w+)\}/g,(match,key)=>values[key]===undefined?match:String(values[key]));
}
