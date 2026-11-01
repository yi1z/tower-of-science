import catalog from './data/branches.json';
import type { Branch, Discipline } from './types';
export const branchVersion=catalog.version;
export const sectionOrder=catalog.sections as Discipline[];
export const branches=catalog.branches as Branch[];
export const branchIndex=new Map(branches.map(b=>[b.id,b]));
