import { Fragment } from 'react';

/** Render optional _{indices} and ^{powers} without injecting HTML. */
export function Expression({text}:{text:string}) {
 const pieces=text.split(/([_^]\{[^{}]+\})/g);
 return <span className="expression">{pieces.map((part,i)=>{
  if(part.startsWith('_{'))return <sub key={i}>{part.slice(2,-1)}</sub>;
  if(part.startsWith('^{'))return <sup key={i}>{part.slice(2,-1)}</sup>;
  return <Fragment key={i}>{part}</Fragment>;
 })}</span>;
}
