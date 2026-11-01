import type { Discipline, RelationType, Standing } from './types';
export const disciplines: Record<Discipline, {label:string;color:string;symbol:string}> = {
 mathematics:{label:'Mathematics',color:'#8b653f',symbol:'∑'},
 physics:{label:'Physics',color:'#426c8a',symbol:'φ'},
 chemistry:{label:'Chemistry',color:'#a36e45',symbol:'⚗'},
 biology:{label:'Life sciences',color:'#547c57',symbol:'ψ'},
 earth:{label:'Earth & environment',color:'#8b7747',symbol:'◒'},
 astronomy:{label:'Astronomy',color:'#766391',symbol:'✧'},
 computing:{label:'Computing',color:'#427f80',symbol:'⌘'},
 engineering:{label:'Engineering',color:'#65748c',symbol:'⚙'},
 materials:{label:'Materials science',color:'#936d80',symbol:'◇'},
 medicine:{label:'Medicine',color:'#9b685a',symbol:'✚'},
 society:{label:'Mind & society',color:'#a06676',symbol:'◎'},
 methods:{label:'Methods & instruments',color:'#697575',symbol:'⌁'}
};
export const relations: Record<RelationType,{label:string;dash:string;short:string;definition:string}> = {
 influence:{label:'Historical influence',dash:'',short:'Influenced',definition:'An earlier idea shaped a later formulation, as described by the cited historical account.'},
 foundation:{label:'Mathematical foundation',dash:'7 3',short:'Underpins',definition:'A mathematical structure or result supplies tools needed to formulate or analyze the later concept.'},
 enables:{label:'Enabling method / discovery',dash:'2 4',short:'Enabled',definition:'A method, instrument, or observation made the later investigation or result possible.'},
 revision:{label:'Revision / replacement',dash:'10 3 2 3',short:'Revised by',definition:'A later account corrects, extends, or replaces an earlier one. The earlier model may remain useful within stated limits.'}
};
export const standings: Record<Standing,string> = {established:'Established',limited:'Valid within limits',superseded:'Superseded',open:'Open research',speculative:'Speculative'};
export const eras = [
 {id:'roots',label:'Early foundations',short:'Foundations',range:'Before 500 BCE',max:-500},
 {id:'classical',label:'Classical traditions',short:'Classical',range:'500 BCE – 500 CE',max:500},
 {id:'exchange',label:'An exchange of ideas',short:'Exchange',range:'500 – 1500',max:1500},
 {id:'revolution',label:'A new way of seeing',short:'Revolution',range:'1500 – 1700',max:1700},
 {id:'enlightenment',label:'Laws of nature',short:'Enlightenment',range:'1700 – 1850',max:1850},
 {id:'unification',label:'Hidden connections',short:'Unification',range:'1850 – 1900',max:1900},
 {id:'modern',label:'Rethinking reality',short:'Modern',range:'1900 – 1950',max:1950},
 {id:'information',label:'Life, Earth & information',short:'Information age',range:'1950 – 2000',max:2000},
 {id:'frontier',label:'At the frontier',short:'Frontiers',range:'2000 – today',max:Infinity}
];
export const eraFor = (year:number) => eras.find(e=>year<e.max)!;
