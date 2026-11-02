const special:Record<string,string>={
 'Prehistory':'史前时期','Early 11th century':'11世纪初','Early modern era':'近代早期',
 'Early 1970s':'20世纪70年代初','Late 1920s':'20世纪20年代末',
 '1744 onward':'1744年起','1916 onward':'1916年起','1933 onward':'1933年起','1968 onward':'1968年起',
 '1830s–1840s':'19世纪30—40年代','1860s–1880s':'19世纪60—80年代','1920s':'20世纪20年代',
 '1920s–1930s':'20世纪20—30年代','1927–1930s':'1927年至20世纪30年代','1950s':'20世纪50年代',
 '1930s; 1936 milestone':'20世纪30年代；1936年为里程碑',
 '2015 detection; 2016 announcement':'2015年探测到；2016年公布',
 'c. 200 BCE – 200 CE':'约公元前200年—公元200年','c. 2000 BCE and earlier':'约公元前2000年及更早','c. 500 BCE and earlier':'约公元前500年及更早'
};
/** Preserve the author's era, approximation, and range; never infer a date from the sorting anchor. */
export function chineseDateLabel(label:string):string|undefined {
 if(special[label])return special[label];
 const match=/^(c\. )?([\d,]+(?:[–-][\d,]+)?)( BCE| CE)?$/.exec(label);
 if(!match)return undefined;
 return `${match[1]?'约':''}${match[3]===' BCE'?'公元前':match[3]===' CE'?'公元':''}${match[2].replaceAll('–','—').replaceAll('-','—')}年`;
}
