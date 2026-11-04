import foundations from './foundations.json';
import physical from './physical.json';
import lifeEarth from './life-earth.json';
import spaceComputing from './space-computing.json';
import expansionSystems from './expansion-systems.json';
import expansionPhysical from './expansion-physical.json';
import expansionLife from './expansion-life.json';
import tours from './tours.json';
import type { Atlas, Collection, Tour } from '../types';
const parts = [foundations,physical,lifeEarth,spaceComputing,expansionSystems,expansionPhysical,expansionLife] as Collection[];
export const atlas:Atlas = {
 version:'2.1.0', reviewedAt:'2026-11-04',
 concepts:parts.flatMap(p=>p.concepts), relationships:parts.flatMap(p=>p.relationships),
 sources:parts.flatMap(p=>p.sources), tours:tours as Tour[]
};
