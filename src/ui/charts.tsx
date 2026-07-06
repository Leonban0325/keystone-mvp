import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { MonthlyFlow, BridgeStep } from '../engine/analytics'
import { eurCompact } from './format'

export const CHART_COLORS = {
  ink: '#122A3E',
  brass: '#B98A2F',
  green: '#3D6B47',
  grey: '#6E7680',
  red: '#B4392E',
  brown: '#8A6D3B',
  hairline: '#DDD8CC',
}

const tick = { fontSize: 10, fill: CHART_COLORS.grey }
const money = (v: number) => eurCompact(v)

const tooltipStyle = {
  background: '#F6F2E9',
  border: `1px solid ${CHART_COLORS.hairline}`,
  borderRadius: 0,
  fontSize: 12,
}

/** Hero chart 1 — stacked monthly cash flows straight off the journal. */
export function CashFlowChart(props: { data: MonthlyFlow[]; height?: number }) {
  const data = props.data.map((d) => ({ ...d, month: d.month.slice(2) }))
  return (
    <ResponsiveContainer width="100%" height={props.height ?? 220}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
        <CartesianGrid stroke={CHART_COLORS.hairline} vertical={false} />
        <XAxis dataKey="month" tick={tick} axisLine={{ stroke: CHART_COLORS.hairline }} tickLine={false} />
        <YAxis tick={tick} tickFormatter={money} axisLine={false} tickLine={false} width={70} />
        <Tooltip formatter={(v) => money(Number(v))} contentStyle={tooltipStyle} />
        <Bar isAnimationActive={false} dataKey="rentIn" name="Rent in" stackId="flow" fill={CHART_COLORS.ink} />
        <Bar isAnimationActive={false} dataKey="vendorOut" name="Vendor out" stackId="flow" fill={CHART_COLORS.brown} />
        <Bar isAnimationActive={false} dataKey="feesOut" name="Fees" stackId="flow" fill={CHART_COLORS.brass} />
        <Bar isAnimationActive={false} dataKey="distributions" name="Owner distributions" stackId="flow" fill={CHART_COLORS.green} />
        <Bar isAnimationActive={false} dataKey="reserveMoves" name="Reserve moves" stackId="flow" fill={CHART_COLORS.grey} />
      </BarChart>
    </ResponsiveContainer>
  )
}

/** Hero chart 2 — NOI waterfall: invisible base + visible delta per step. */
export function NoiBridgeChart(props: { steps: BridgeStep[]; height?: number }) {
  const data = props.steps.map((s) => ({
    label: s.label,
    base: s.delta >= 0 ? s.total - s.delta : s.total,
    delta: Math.abs(s.delta),
    negative: s.delta < 0,
    isTotal: s.label === 'NOI',
  }))
  return (
    <ResponsiveContainer width="100%" height={props.height ?? 220}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
        <CartesianGrid stroke={CHART_COLORS.hairline} vertical={false} />
        <XAxis dataKey="label" tick={tick} axisLine={{ stroke: CHART_COLORS.hairline }} tickLine={false} interval={0} />
        <YAxis tick={tick} tickFormatter={money} axisLine={false} tickLine={false} width={70} />
        <Tooltip formatter={(v) => money(Number(v))} contentStyle={tooltipStyle} />
        <Bar isAnimationActive={false} dataKey="base" stackId="wf" fill="transparent" />
        <Bar isAnimationActive={false} dataKey="delta" stackId="wf" name="Δ">
          {data.map((entry, i) => (
            <Cell
              key={i}
              fill={entry.isTotal ? CHART_COLORS.ink : entry.negative ? CHART_COLORS.red : CHART_COLORS.green}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export function TrendLine(props: {
  data: { month: string; value: number }[]
  height?: number
  color?: string
  moneyAxis?: boolean
}) {
  const data = props.data.map((d) => ({ ...d, month: d.month.slice(2) }))
  return (
    <ResponsiveContainer width="100%" height={props.height ?? 180}>
      <LineChart data={data} margin={{ top: 6, right: 6, left: 4, bottom: 0 }}>
        <CartesianGrid stroke={CHART_COLORS.hairline} vertical={false} />
        <XAxis dataKey="month" tick={tick} axisLine={{ stroke: CHART_COLORS.hairline }} tickLine={false} />
        <YAxis
          tick={tick}
          tickFormatter={props.moneyAxis === false ? undefined : money}
          axisLine={false}
          tickLine={false}
          width={props.moneyAxis === false ? 32 : 70}
        />
        <Tooltip
          formatter={(v) => (props.moneyAxis === false ? v : money(Number(v)))}
          contentStyle={tooltipStyle}
        />
        <Line
          isAnimationActive={false}
          type="monotone"
          dataKey="value"
          stroke={props.color ?? CHART_COLORS.brass}
          strokeWidth={2}
          dot={{ r: 2, fill: CHART_COLORS.ink, strokeWidth: 0 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function SpendDonut(props: { data: { category: string; amountCents: number }[]; height?: number }) {
  const palette = [CHART_COLORS.ink, CHART_COLORS.brass, CHART_COLORS.green, CHART_COLORS.brown, CHART_COLORS.grey]
  return (
    <ResponsiveContainer width="100%" height={props.height ?? 200}>
      <PieChart>
        <Pie
          isAnimationActive={false}
          data={props.data}
          dataKey="amountCents"
          nameKey="category"
          innerRadius="55%"
          outerRadius="85%"
          stroke="#F6F2E9"
        >
          {props.data.map((_, i) => (
            <Cell key={i} fill={palette[i % palette.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(v) => money(Number(v))} contentStyle={tooltipStyle} />
      </PieChart>
    </ResponsiveContainer>
  )
}

/** Row-level 6-month sparkline (no axes). */
export function Sparkline(props: { values: number[]; width?: number; height?: number }) {
  const { values } = props
  const w = props.width ?? 90
  const h = props.height ?? 20
  const max = Math.max(...values, 1)
  const points = values
    .map((v, i) => `${(i / Math.max(1, values.length - 1)) * (w - 4) + 2},${h - 2 - (v / max) * (h - 6)}`)
    .join(' ')
  return (
    <svg width={w} height={h} className="inline-block align-middle">
      <polyline points={points} fill="none" stroke={CHART_COLORS.brass} strokeWidth="1.5" />
    </svg>
  )
}
