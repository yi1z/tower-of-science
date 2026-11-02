import test from 'node:test';
import assert from 'node:assert/strict';
import {atlas} from '../src/data/atlas';
import {chineseAtlas,searchLocalizedConcepts} from '../src/i18n/content';
import {defaultState,parseState,serializeState} from '../src/state';
import {validateAtlas} from '../src/validate';

const journeyId='neural-networks-to-transformers';
const stops=['neural-networks','machine-learning','backpropagation','sequence-recurrent-networks','long-short-term-memory','sequence-to-sequence','attention-mechanisms','transformers'];
const originalJourneys=[
 ['numbers-to-computation',['counting','arithmetic','positional-notation','zero-placeholder','zero-number','algorithms','binary-numbers','boolean-algebra','mathematical-logic','turing-machine','halting-problem','quantum-computing']],
 ['geometry-to-spacetime',['geometry','deductive-proof','euclidean-geometry','analytic-geometry','calculus','differential-geometry','non-euclidean-geometry','tensor-calculus','special-relativity','general-relativity','black-holes']],
 ['motion-to-quantum-fields',['measurement','inertia','classical-mechanics','thermodynamics','electromagnetism','blackbody-quanta','quantum-mechanics','quantum-field-theory','quantum-electrodynamics','gauge-theory','renormalization-group','standard-model']],
 ['atoms-to-living-systems',['atomism','atomic-theory','chemical-structure','chemical-bonding','microscope','cell-observation','cell-theory','mendelian-genetics','chromosome-theory','dna-as-genetic-material','dna-structure','molecular-biology']],
 ['observation-to-modern-cosmology',['sky-cycles','geocentrism','heliocentrism','kepler-laws','telescope','stellar-parallax','period-luminosity','cosmic-expansion','big-bang','cosmic-microwave-background','dark-energy','lcdm']],
 ['probability-to-learning-and-decisions',['probability','bayes-theorem','bayesian-networks','causal-inference','information-theory','machine-learning','deep-learning','expected-utility','game-theory','nash-equilibrium','prospect-theory','behavioral-economics']]
];

test('the Transformer journey follows eight stops after the unchanged original journeys in both languages',()=>{
 for(const edition of [atlas,chineseAtlas]){
  assert.deepEqual(edition.tours.slice(0,6).map(t=>[t.id,t.steps.map(s=>s.conceptId)]),originalJourneys);
  assert.equal(edition.tours[6].id,journeyId);
  assert.deepEqual(edition.tours[6].steps.map(s=>s.conceptId),stops);
  assert(!stops.includes('recurrent-networks'),'Hopfield memory is not the sequence RNN stop');
 }
 assert.equal(atlas.tours[6].title,'From neural networks to Transformers');
 assert.equal(chineseAtlas.tours[6].title,'从神经网络到Transformer');
 for(const [i,step] of chineseAtlas.tours[6].steps.entries()){
  assert.notEqual(step.narration,atlas.tours[6].steps[i].narration);
  assert.match(step.narration,/[\u3400-\u9fff]/);
 }
});

test('new AI entries have bilingual details, prose definitions, searchable names, and primary citations',()=>{
 const primarySources=new Map([
  ['sequence-recurrent-networks',['https://doi.org/10.1207/s15516709cog1402_1']],
  ['long-short-term-memory',['https://people.idsia.ch/~juergen/lstm1997-2024head.pdf']],
  ['sequence-to-sequence',['https://arxiv.org/abs/1406.1078','https://arxiv.org/abs/1409.3215']]
 ]);
 for(const [id,urls] of primarySources){
  const en=atlas.concepts.find(c=>c.id===id)!,zh=chineseAtlas.concepts.find(c=>c.id===id)!;
  assert.equal(en.branchId,'computing-learning');assert.equal(zh.branchId,en.branchId);
  assert.equal(en.representation?.kind,'definition');
  for(const key of ['title','summary','problem','development','limitations','example','historicalSetting'] as const){assert(en[key]);assert.match(zh[key]!,/[\u3400-\u9fff]/);assert.notEqual(zh[key],en[key]);}
  assert.match(zh.representation!.expression,/[\u3400-\u9fff]/);
  assert.match(zh.representation!.explanation,/[\u3400-\u9fff]/);
  for(const url of urls)assert(en.sourceIds.some(sourceId=>atlas.sources.find(s=>s.id===sourceId)?.url===url));
  for(const locale of ['en','zh-CN'] as const)for(const query of [en.title,zh.title])assert(searchLocalizedConcepts(query,locale).some(c=>c.id===id));
 }
 assert.equal(atlas.concepts.length,453);assert.equal(atlas.relationships.length,831);
});

test('sequence lineage is cited and separates editorial connections from documented influence',()=>{
 const pairs=[['neural-networks','sequence-recurrent-networks'],['backpropagation','sequence-recurrent-networks'],['sequence-recurrent-networks','long-short-term-memory'],['backpropagation','long-short-term-memory'],['long-short-term-memory','sequence-to-sequence'],['sequence-to-sequence','attention-mechanisms'],['sequence-to-sequence','transformers'],['attention-mechanisms','transformers']];
 for(const [source,target] of pairs){
  const edge=atlas.relationships.find(e=>e.source===source&&e.target===target)!;
  assert(edge,`${source} → ${target}`);assert(edge.sourceIds.length);
  for(const sourceId of edge.sourceIds)assert(atlas.sources.some(s=>s.id===sourceId));
  assert.equal(edge.evidence,source==='sequence-recurrent-networks'?'conceptual':'documented');
 }
 assert(atlas.relationships.find(e=>e.id==='attention-mechanisms--transformers')!.sourceIds.includes('sc-attention'));
});

test('each new journey stop round-trips through existing share links in both languages and display modes',()=>{
 for(const locale of ['en','zh-CN'] as const)for(const display of ['language','formal'] as const)for(const [step,concept] of stops.entries()){
  const state={...defaultState,locale,display,tour:journeyId,step,concept};
  assert.deepEqual(parseState(serializeState(state)),state);
 }
});

test('journey validation accepts collection growth instead of a fixed journey count',()=>{
 const expanded={...atlas,tours:[...atlas.tours,{...atlas.tours[0],id:'additional-journey'}]};
 assert.deepEqual(validateAtlas(expanded),[]);
 assert.deepEqual(validateAtlas({...atlas,tours:[atlas.tours[6]]}),[]);
 assert(validateAtlas({...atlas,tours:[]}).some(error=>error.includes('at least one journey')));
});
