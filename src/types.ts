export type Discipline = 'mathematics' | 'physics' | 'chemistry' | 'biology' | 'earth' | 'astronomy' | 'computing' | 'society' | 'methods';
export type Standing = 'established' | 'limited' | 'superseded' | 'open' | 'speculative';
export type RelationType = 'influence' | 'foundation' | 'enables' | 'revision';
export interface Contributor { name: string; role: string }
export interface Source { id: string; title: string; url: string; publisher: string }
export interface Concept {
 id: string; title: string; aliases: string[]; discipline: Discipline; tags: string[];
 kind: 'concept' | 'theory' | 'method' | 'discovery' | 'mathematics' | 'instrument';
 date: { year: number; label: string; precision: 'exact' | 'approximate' | 'range'; note: string };
 summary: string; problem: string; development: string; limitations: string;
 standing: Standing; contributors: Contributor[]; sourceIds: string[];
 claimSources: { summary: string[]; history: string[] };
 example?: string; equation?: { expression: string; explanation: string };
}
export interface Relationship { id: string; source: string; target: string; type: RelationType; explanation: string; evidence: 'documented' | 'conceptual' | 'contested'; sourceIds: string[] }
export interface Tour { id: string; title: string; subtitle: string; color: string; steps: { conceptId: string; narration: string }[] }
export interface Collection { concepts: Concept[]; relationships: Relationship[]; sources: Source[] }
export interface Atlas extends Collection { version: string; reviewedAt: string; tours: Tour[] }
