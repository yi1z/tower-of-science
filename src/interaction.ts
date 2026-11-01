export interface Viewport { x:number; y:number; zoom:number }
export interface CameraState { concept:string; era:string; view:'tower'|'list' }
export type CameraIntent = { kind:'home' } | { kind:'concept'; id:string } | { kind:'era'; id:string } | {kind:'point';x:number;y:number;zoom:number};

/** State transitions never interpret deselection or a resize as a request to go home. */
export function cameraIntent(previous:CameraState|null,next:CameraState):CameraIntent|null {
 if(next.view!=='tower')return null;
 if(!previous)return next.concept?{kind:'concept',id:next.concept}:next.era?{kind:'era',id:next.era}:{kind:'home'};
 if(next.concept&&next.concept!==previous.concept)return {kind:'concept',id:next.concept};
 return null;
}
export interface DragGesture { pointerId:number; startX:number; startY:number; viewport:Viewport; dragging:boolean }
export function dragViewport(gesture:DragGesture,x:number,y:number):Viewport|null {
 const dx=x-gesture.startX,dy=y-gesture.startY;
 if(!gesture.dragging&&Math.hypot(dx,dy)<6)return null;
 gesture.dragging=true;
 return {...gesture.viewport,x:gesture.viewport.x+dx,y:gesture.viewport.y+dy};
}
export interface TouchPoint { x:number;y:number }
export interface PinchGesture { viewport:Viewport; midpoint:TouchPoint; distance:number }
export function pinchViewport(gesture:PinchGesture,a:TouchPoint,b:TouchPoint):Viewport {
 const zoom=Math.min(1.5,Math.max(.02,gesture.viewport.zoom*Math.hypot(a.x-b.x,a.y-b.y)/Math.max(1,gesture.distance)));
 const ratio=zoom/gesture.viewport.zoom;
 return {zoom,x:(a.x+b.x)/2-(gesture.midpoint.x-gesture.viewport.x)*ratio,y:(a.y+b.y)/2-(gesture.midpoint.y-gesture.viewport.y)*ratio};
}
