export const ERA_TAG_HEIGHT=42;
const gap=3,step=ERA_TAG_HEIGHT+gap;

/** Fit tags in chronological screen order, minimizing their squared displacement.
 * Subtracting the required spacing turns collisions into out-of-order centers. */
export function placeEraTags(anchors:number[],available:number){
 const trackHeight=Math.max(available,anchors.length*step-gap);
 const groups:{mean:number;count:number}[]=[];
 anchors.forEach((anchor,i)=>{
  groups.push({mean:anchor-i*step,count:1});
  while(groups.length>1){
   const right=groups[groups.length-1],left=groups[groups.length-2];
   if(left.mean<=right.mean)break;
   left.mean=(left.mean*left.count+right.mean*right.count)/(left.count+right.count);
   left.count+=right.count;groups.pop();
  }
 });
 const min=ERA_TAG_HEIGHT/2,max=trackHeight-min-(anchors.length-1)*step;
 const positions:number[]=[];
 for(const group of groups){
  const center=Math.max(min,Math.min(max,group.mean));
  for(let i=0;i<group.count;i++)positions.push(center+positions.length*step);
 }
 return {positions,trackHeight};
}
