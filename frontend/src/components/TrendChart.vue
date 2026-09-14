<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts/core'
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
echarts.use([LineChart, GridComponent, TooltipComponent, CanvasRenderer])
const props = defineProps<{ values: { date: string; amount: number }[] }>()
const root = ref<HTMLDivElement>()
let chart: echarts.ECharts | undefined
let observer: ResizeObserver | undefined
function render() {
  chart?.setOption({
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.96)',
      borderColor: '#e2e8f0',
      borderWidth: 1,
      padding: [8, 12],
      textStyle: { color: '#1e293b', fontSize: 12 },
      extraCssText: 'box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06); border-radius: 8px;',
      valueFormatter: (v: unknown) =>
        `¥ ${Number(v).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`,
    },
    grid: { top: 25, left: 60, right: 20, bottom: 28 },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: props.values.map((v) => v.date),
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisTick: { show: false },
      axisLabel: { color: '#64748b', fontSize: 12 },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
      axisLabel: { color: '#64748b', fontSize: 12 },
    },
    series: [
      {
        type: 'line',
        smooth: 0.3,
        data: props.values.map((v) => v.amount),
        symbolSize: 6,
        itemStyle: { color: '#0f766e' },
        lineStyle: { width: 2.5, color: '#0f766e' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(15, 118, 110, 0.22)' },
            { offset: 1, color: 'rgba(15, 118, 110, 0.01)' },
          ]),
        },
      },
    ],
  })
}
onMounted(() => {
  chart = echarts.init(root.value)
  render()
  observer = new ResizeObserver(() => chart?.resize())
  observer.observe(root.value!)
})
watch(() => props.values, render)
onBeforeUnmount(() => {
  observer?.disconnect()
  chart?.dispose()
})
</script>
<template>
  <div ref="root" class="trend-chart" role="img" aria-label="最近七天采购订单金额趋势图"></div>
</template>
