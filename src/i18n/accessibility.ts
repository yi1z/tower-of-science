import type {AriaLabelConfig} from '@xyflow/react';
export const chineseAriaLabels:AriaLabelConfig={
 'node.a11yDescription.default':'按回车键选择节点，用方向键移动，按Esc键取消。',
 'node.a11yDescription.keyboardDisabled':'按回车键选择节点，按Esc键取消。',
 'node.a11yDescription.ariaLiveMessage':({direction,x,y})=>`节点已向${({left:'左',right:'右',up:'上',down:'下'} as Record<string,string>)[direction]??direction}移动，新位置：${x}，${y}。`,
 'edge.a11yDescription.default':'按回车键阅读这条联系。',
 'controls.ariaLabel':'视图控制','controls.zoomIn.ariaLabel':'放大','controls.zoomOut.ariaLabel':'缩小',
 'controls.fitView.ariaLabel':'显示整个图谱','controls.interactive.ariaLabel':'切换交互模式',
 'minimap.ariaLabel':'图谱缩略图','handle.ariaLabel':'连接端点'
};
