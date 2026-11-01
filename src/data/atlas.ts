import foundations from './foundations.json';
import physical from './physical.json';
import lifeEarth from './life-earth.json';
import spaceComputing from './space-computing.json';
import tours from './tours.json';
import type { Atlas, Collection, Tour } from '../types';
const parts = [foundations,physical,lifeEarth,spaceComputing] as Collection[];
export const atlas:Atlas = {
 version:'1.0.0', reviewedAt:'2026-11-01',
 concepts:parts.flatMap(p=>p.concepts), relationships:parts.flatMap(p=>p.relationships),
 sources:parts.flatMap(p=>p.sources), tours:tours as Tour[]
};
