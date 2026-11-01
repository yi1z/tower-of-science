export type Discipline = 'mathematics' | 'physics' | 'chemistry' | 'biology' | 'earth' | 'astronomy' | 'computing' | 'society' | 'methods' | 'engineering' | 'materials' | 'medicine';
export interface Branch { id:string; label:string; discipline:Discipline; order:number }
export type Standing = 'established' | 'limited' | 'superseded' | 'open' | 'speculative';
export type RelationType = 'influence' | 'foundation' | 'enables' | 'revision';
export interface Contributor { name: string; role: string }
export interface Source { id: string; title: string; url: string; publisher: string }
export interface Representation {
 kind:'formula'|'definition'; expression:string; explanation:string; sourceIds:string[];
}
export interface Concept {
 id: string; title: string; aliases: string[]; discipline: Discipline; branchId:string; relatedBranchIds?:string[]; tags: string[];
 kind: 'concept' | 'theory' | 'method' | 'discovery' | 'mathematics' | 'instrument';
 date: { year: number; label: string; precision: 'exact' | 'approximate' | 'range'; note: string };
 summary: string; problem: string; development: string; limitations: string;
 standing: Standing; contributors: Contributor[]; sourceIds: string[];
 claimSources: { summary: string[]; history: string[] };
 example?: string; historicalSetting?:string; representation?: Representation;
}
export interface Relationship { id: string; source: string; target: string; type: RelationType; explanation: string; evidence: 'documented' | 'conceptual' | 'contested'; sourceIds: string[] }
export interface Tour { id: string; title: string; subtitle: string; color: string; steps: { conceptId: string; narration: string }[] }
export interface Collection { concepts: Concept[]; relationships: Relationship[]; sources: Source[] }
export interface Atlas extends Collection { version: string; reviewedAt: string; tours: Tour[] }
