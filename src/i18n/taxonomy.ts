import {disciplines,relations,standings,eras} from '../config';
import {branches} from '../branches';
import type {Discipline,RelationType,Standing} from '../types';

const sectionNames:Record<Discipline,string>={mathematics:'数学',physics:'物理学',chemistry:'化学',biology:'生命科学',earth:'地球与环境',astronomy:'天文学',computing:'计算科学',engineering:'工程学',materials:'材料科学',medicine:'医学',society:'心智与社会',methods:'方法与仪器'};
export const branchNames:Record<string,string>={
 'math-number':'数与代数','math-geometry':'几何与拓扑','math-analysis':'分析与动力系统','math-probability':'概率与统计','math-logic':'逻辑与基础',
 'methods-instruments':'测量与仪器','methods-inference':'实验与推断','computing-algorithms':'计算与算法','computing-information':'信息与安全','computing-learning':'人工智能与学习','computing-systems':'系统与编程',
 'engineering-control':'系统与控制','engineering-mechanical':'机械与结构','engineering-electrical':'电气与通信','physics-mechanics':'力学与流体','physics-thermal':'热学与统计物理','physics-fields':'场与相对论','physics-quantum':'量子与粒子','physics-condensed':'凝聚态',
 'astronomy-observation':'天文观测','astronomy-stars':'恒星与行星','astronomy-cosmology':'宇宙学','earth-geology':'地质与地球物理','earth-climate':'大气与气候','earth-water':'海洋与水文',
 'chemistry-structure':'原子与结构','chemistry-reactions':'反应与物理化学','chemistry-organic':'有机与分析化学','chemistry-biochemistry':'生物化学','materials-structure':'结构与晶体学','materials-phases':'性质与物相','materials-functional':'聚合物与功能材料',
 'biology-cells':'细胞与微生物','biology-genetics':'遗传与发育','biology-evolution':'进化与生态','biology-physiology':'生理与神经科学','medicine-disease':'疾病与流行病学','medicine-immunity':'免疫与感染','medicine-therapeutics':'治疗与药理',
 'society-psychology':'心理与认知','society-economics':'经济与决策','society-networks':'社会与网络','society-language':'语言'
};
export const zhDisciplines=Object.fromEntries(Object.entries(disciplines).map(([id,value])=>[id,{...value,label:sectionNames[id as Discipline]}])) as typeof disciplines;
const relationText:Record<RelationType,{label:string;short:string;definition:string}>={
 influence:{label:'历史影响',short:'影响了',definition:'根据所引历史文献的记载，较早的思想影响了后来的理论或表述。'},
 foundation:{label:'数学基础',short:'奠定基础',definition:'数学结构或成果为表述或分析后来的概念提供了必要工具。'},
 enables:{label:'促成研究的方法或发现',short:'促成',definition:'某种方法、仪器或观测使后来的研究或成果成为可能。'},
 revision:{label:'修正或取代',short:'被修正',definition:'后来的理论修正、扩展或取代了较早的理论。早期模型在特定条件下仍可能适用。'}
};
export const zhRelations=Object.fromEntries(Object.entries(relations).map(([id,value])=>[id,{...value,...relationText[id as RelationType]}])) as typeof relations;
export const zhStandings:Record<Standing,string>={established:'已确立',limited:'在限定条件下有效',superseded:'已被取代',open:'尚在研究',speculative:'推测性假说'};
const eraText=[
 ['早期基础','早期基础','公元前500年以前'],['古典传统','古典时代','公元前500年—公元500年'],['思想的交流','交流时代','500—1500年'],['观察世界的新方式','科学革命','1500—1700年'],['自然的规律','启蒙时代','1700—1850年'],['隐藏的联系','走向统一','1850—1900年'],['重新理解现实','现代科学','1900—1950年'],['生命、地球与信息','信息时代','1950—2000年'],['探索前沿','科学前沿','2000年至今']
];
export const zhEras=eras.map((era,i)=>({...era,label:eraText[i][0],short:eraText[i][1],range:eraText[i][2]}));
export const zhBranches=branches.map(branch=>({...branch,label:branchNames[branch.id]}));
export const englishTaxonomy={disciplines,relations,standings,eras,branches};
export const chineseTaxonomy={disciplines:zhDisciplines,relations:zhRelations,standings:zhStandings,eras:zhEras,branches:zhBranches};
