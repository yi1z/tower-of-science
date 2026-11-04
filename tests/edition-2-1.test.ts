import test from 'node:test';
import assert from 'node:assert/strict';
import { atlas } from '../src/data/atlas';
import { chineseAtlas, searchLocalizedConcepts } from '../src/i18n/content';
import { defaultState, parseState, serializeState } from '../src/state';
import { validateReleaseCoverage } from '../src/validate';
import type { Discipline } from '../src/types';

const additions: Record<Discipline, string> = {
 mathematics: 'modular-arithmetic fundamental-theorem-calculus prime-number-theorem spectral-theorem singular-value-decomposition law-large-numbers stochastic-calculus algebraic-topology optimal-transport riemann-hypothesis',
 methods: 'confidence-intervals bootstrap-resampling meta-analysis survival-analysis design-of-experiments principal-component-analysis missing-data-mechanisms multiple-testing-control reproducible-research atomic-clocks scanning-tunneling-microscopy cryo-electron-microscopy',
 computing: 'gradient-descent automatic-differentiation decision-trees ensemble-learning self-supervised-learning graph-neural-networks differential-privacy zero-knowledge-proofs quantum-error-correction flp-impossibility',
 engineering: 'transfer-functions bode-plots observability controllability robust-control adaptive-control system-identification finite-volume-method structural-buckling fatigue-life electrical-impedance matched-filtering',
 physics: 'doppler-effect coriolis-effect turbulent-energy-cascade fluctuation-dissipation-theorem spontaneous-symmetry-breaking bcs-superconductivity bose-einstein-condensation quantum-decoherence loop-quantum-gravity holographic-principle',
 astronomy: 'jeans-instability accretion-disks eddington-luminosity core-accretion asteroseismology type-ia-standardization cosmic-distance-ladder primordial-black-holes',
 earth: 'geostrophic-balance radiative-transfer numerical-weather-prediction carbon-silicate-cycle sequence-stratigraphy sediment-transport reactive-transport climate-tipping-elements',
 chemistry: 'michaelis-menten-kinetics enzyme-allostery chemiosmosis protein-folding-thermodynamics transition-state-theory resonance-delocalization ligand-field-theory density-functional-theory pericyclic-selection-rules rna-world',
 materials: 'point-defects diffusion-in-solids grain-boundaries recrystallization precipitation-hardening hall-petch fracture-mechanics viscoelasticity glass-transition martensitic-transformations percolation composite-materials metamaterials high-entropy-alloys',
 biology: 'atp-energy-coupling apoptosis autophagy cell-cycle-checkpoints alternative-rna-splicing rna-interference transposable-elements stem-cell-pluripotency hebbian-plasticity ecological-resilience',
 medicine: 'innate-pattern-recognition antigen-presentation complement-system mrna-vaccines two-hit-hypothesis oncogenes pharmacogenomics oral-rehydration',
 society: 'predictive-processing theory-of-mind cognitive-load-theory common-pool-governance externalities weak-ties speech-acts compositional-semantics'
};
const routes = {
 'materials-bend-break-strengthen': 'elasticity crystal-lattices phase-diagrams point-defects dislocations grain-boundaries precipitation-hardening hall-petch fracture-mechanics composite-materials',
 'learning-from-noisy-evidence': 'probability statistical-sampling design-of-experiments randomized-trials confidence-intervals principal-component-analysis missing-data-mechanisms bootstrap-resampling meta-analysis reproducible-research',
 'predicting-earths-climate': 'measurement greenhouse-effect radiative-transfer numerical-weather-prediction climate-modeling ice-albedo-feedback carbon-silicate-cycle earth-system-science climate-tipping-elements uncertainty-quantification'
};
const newIds = new Set(Object.values(additions).flatMap(s => s.split(' ')));
const editions = [atlas, chineseAtlas];

test('edition 2.1 contains all 120 commissioned topics in their disciplines, with bilingual examples and sourced representations', () => {
 assert.equal(newIds.size, 120);
 for (const edition of editions) {
  assert.equal(edition.concepts.length, 573);
  assert.equal(edition.tours.length, 10);
  assert.deepEqual(validateReleaseCoverage(edition), []);
  const concepts = new Map(edition.concepts.map(c => [c.id, c]));
  for (const [field, ids] of Object.entries(additions)) for (const id of ids.split(' ')) {
   const c = concepts.get(id)!;
   assert.equal(c.discipline, field, id);
   assert(c.example && c.representation?.sourceIds.length, id);
   if (edition === chineseAtlas) for (const s of [c.title, c.example, c.representation.explanation])
    assert.match(s, /\p{Script=Han}/u, id);
  }
 }
});

test('every new topic has a relationship path into the preexisting atlas', () => {
 const neighbors = new Map(atlas.concepts.map(c => [c.id, new Set<string>()]));
 for (const {source, target} of atlas.relationships) {
  neighbors.get(source)!.add(target);
  neighbors.get(target)!.add(source);
 }
 const frontier = [...neighbors.keys()].filter(id => !newIds.has(id)), reached = new Set(frontier);
 for (const id of frontier) for (const next of neighbors.get(id)!) if (!reached.has(next)) {
  reached.add(next); frontier.push(next);
 }
 assert.deepEqual([...newIds].filter(id => !reached.has(id)), []);
 for (const [edge, evidence] of [
  ['matched-filtering--gravitational-wave-astronomy', 'documented'],
  ['type-ia-standardization--dark-energy', 'documented'],
  ['automatic-differentiation--backpropagation', 'conceptual']
 ]) assert.equal(atlas.relationships.find(e => e.id === edge)?.evidence, evidence, edge);
});

test('open conjectures, unconfirmed proposals, and limited models retain distinct standings in both languages', () => {
 for (const [id, standing] of Object.entries({
  'riemann-hypothesis': 'open', 'rna-world': 'open', 'holographic-principle': 'open',
  'loop-quantum-gravity': 'speculative', 'primordial-black-holes': 'speculative', 'predictive-processing': 'limited'
 })) for (const edition of editions) assert.equal(edition.concepts.find(c => c.id === id)?.standing, standing, id);
});

test('new entries are searchable by both names, including from the other language', () => {
 for (const id of ['fluctuation-dissipation-theorem', 'hall-petch', 'climate-tipping-elements', 'rna-world', 'bootstrap-resampling']) {
  for (const edition of editions) for (const locale of ['en', 'zh-CN'] as const) {
   const name = edition.concepts.find(c => c.id === id)!.title;
   assert(searchLocalizedConcepts(name, locale).some(c => c.id === id), name);
  }
 }
});

test('the three appended journeys share the same exact stops across languages and restore every shared stop', () => {
 for (const edition of editions) {
  assert.deepEqual(edition.tours.slice(7).map(t => t.id), Object.keys(routes));
  for (const [id, sequence] of Object.entries(routes)) {
   const steps = edition.tours.find(t => t.id === id)!.steps;
   assert.deepEqual(steps.map(s => s.conceptId), sequence.split(' '));
   for (const [step, {conceptId, narration}] of steps.entries()) {
    if (edition === chineseAtlas) assert.match(narration, /\p{Script=Han}/u);
    for (const display of ['language', 'formal'] as const) {
     const state = {...defaultState, locale: edition === atlas ? 'en' as const : 'zh-CN' as const, tour: id, step, concept: conceptId, display};
     assert.deepEqual(parseState(serializeState(state)), state);
    }
   }
  }
 }
});
