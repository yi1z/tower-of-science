import { atlas } from '../src/data/atlas';
import { validateAtlas,validateReleaseCoverage } from '../src/validate';
import { indexGraph, layoutGraph, NODE_WIDTH, NODE_HEIGHT } from '../src/graph';
const errors=[...validateAtlas(atlas),...validateReleaseCoverage(atlas)];
const layout=layoutGraph(atlas.concepts);
for(let i=0;i<atlas.concepts.length;i++)for(let j=i+1;j<atlas.concepts.length;j++){
 const a=layout.positions.get(atlas.concepts[i].id)!,b=layout.positions.get(atlas.concepts[j].id)!;
 if(a&&b&&Math.abs(a.x-b.x)<NODE_WIDTH&&Math.abs(a.y-b.y)<NODE_HEIGHT)errors.push(`Overlapping nodes: ${atlas.concepts[i].id}, ${atlas.concepts[j].id}`);
}
if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}
else{const index=indexGraph(atlas);console.log(`Validated ${atlas.concepts.length} concepts, ${atlas.relationships.length} relationships, ${atlas.sources.length} sources, ${atlas.tours.length} tours, ${index.pillars.length} pillars. Graph is chronological, acyclic, referenced, and free of node overlaps.`);}
