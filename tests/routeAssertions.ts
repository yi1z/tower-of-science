import assert from 'node:assert/strict';
import type {Point} from '../src/graph';

export function assertCleanRoute(points:Point[],id:string){
 const first=points[0],second=points[1],last=points.at(-1)!,penultimate=points.at(-2)!;
 assert(second.x===first.x&&second.y<first.y,`${id} must leave upwards`);
 assert(last.x===penultimate.x&&last.y<penultimate.y,`${id} must arrive upwards`);
 for(let i=1;i<points.length-1;i++){
  const a=points[i-1],b=points[i],c=points[i+1];
  const turn=(b.x-a.x)*(c.y-b.y)-(b.y-a.y)*(c.x-b.x);
  assert.notEqual(turn,0,`${id}: redundant or retraced segment at ${i}`);
 }
}
