export type Locale = 'en' | 'zh-CN';
export const localeStorageKey = 'tower-of-science.locale';
export const isLocale = (value:unknown):value is Locale => value==='en'||value==='zh-CN';

/** URL parsing stays pure; storage and browser preferences are read only at the boundary. */
export function preferredLocale(saved:unknown,languages:readonly string[]):Locale {
 if(isLocale(saved))return saved;
 for(const language of languages){
  if(/^zh(?:-|$)/i.test(language))return 'zh-CN';
  if(/^en(?:-|$)/i.test(language))return 'en';
 }
 return 'en';
}
export function readPreferredLocale():Locale {
 let saved:unknown;
 try{saved=window.localStorage.getItem(localeStorageKey);}catch{/* Storage is optional. */}
 return preferredLocale(saved,navigator.languages?.length?navigator.languages:[navigator.language]);
}
export function savePreferredLocale(locale:Locale){
 try{window.localStorage.setItem(localeStorageKey,locale);}catch{/* Keep the current session usable. */}
}
export function isComposing(event:{isComposing?:boolean;keyCode?:number}){
 return event.isComposing===true||event.keyCode===229;
}
