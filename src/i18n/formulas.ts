/** Translate explanatory words, preserving operators, functions, and scientific notation. */
// These entries are classified as definitions by the atlas, but their expressions
// contain only mathematical notation or formal-language syntax, not prose.
export const symbolicDefinitions=new Set(['limits','type-theory','formal-languages','functional-programming','fast-fourier-transform','counting','positional-notation','irrational-numbers','zero-placeholder','binary-numbers','graph-theory','mathematical-logic','category-theory','dna-structure','standard-model','causal-inference','marginal-utility']);
const words:Record<string,readonly (readonly [string,string])[]>={
 photosynthesis:[['light','光能']],
 'trophic-dynamics':[['Efficiency','效率'],['production at level n+1','第 n+1 营养级的生产量'],['production at level n','第 n 营养级的生产量']],
 epidemiology:[['Risk ratio','相对危险度'],['risk in exposed','暴露组风险'],['risk in unexposed','未暴露组风险']],
 'ice-albedo-feedback':[['Absorbed solar energy','吸收的太阳能']],
 'stochastic-processes':[['past','过去状态']],
 'chemical-potential':[['at fixed T, p and other n','（保持 T、p 及其他组分的 n 不变）']],
 'monte-carlo':[['mean','均值']],
 'logical-clocks':[['implies','蕴含']],
 'stability-theory':[['and','且'],['for x != 0','（x != 0）']],
 'kalman-filter':[['predicted measurement','预测观测值'],['measurement','观测值'],['prediction','预测值'],['estimate','估计值']],
 'optimal-control':[['minimize','最小化'],['subject to','满足约束']],
 'negative-feedback-amplifier':[['closed-loop gain','闭环增益']],
 'bernoulli-flow':[['constant','常数']],
 'hypothesis-testing':[['power','检验功效'],['reject H₀','拒绝 H₀'],['specified alternative','给定备择假设']],
 'modified-newtonian-dynamics':[['when','当']],
 'public-goods':[['marginal benefits','边际收益'],['marginal cost','边际成本']],
 'preferential-attachment':[['attach to i','连接到 i']],
 'water-cycle':[['inputs','输入量'],['outputs','输出量']],
 inertia:[['constant','常量']],
 'avogadro-hypothesis':[['fixed T, P','T、P 不变']],
 'chemical-kinetics':[['rate','反应速率']]
};
export function translateFormula(id:string,expression:string){
 return (words[id]??[]).reduce((text,[original,translated])=>text.replaceAll(original,translated),expression);
}
