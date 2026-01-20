"use client"

import { useEffect, useState, useMemo } from "react"
import { ComposedChart, Line, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts"

interface MarketCapChartProps {
  tokenAddress: string
  externalData?: ChartDataPoint[]
}

interface ChartDataPoint {
  timestamp: number
  price: number
  marketCap: number
  time: string
  volume?: number
}

interface Candle {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

type Timeframe = '15m' | '1h' | '4h' | '1d'

const formatNumber = (num: number): string => {
  if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`
  if (num >= 1000) return `$${(num / 1000).toFixed(2)}K`
  return `$${num.toFixed(6)}`
}

export function MarketCapChart({ tokenAddress, externalData }: MarketCapChartProps) {
  const [candles, setCandles] = useState<Candle[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeframe, setTimeframe] = useState<Timeframe>('1h')
  const [currentMC, setCurrentMC] = useState<number | null>(null)
  
  // Handle external data updates (from real-time stream)
  useEffect(() => {
    if (externalData && externalData.length > 0) {
      const convertedCandles: Candle[] = externalData.map((point) => ({
        time: Math.floor(point.timestamp / 1000),
        open: point.price,
        high: point.price,
        low: point.price,
        close: point.price,
        volume: point.volume || 0,
      }))
      setCandles(convertedCandles)
      setCurrentMC(externalData[externalData.length - 1].marketCap)
      setIsLoading(false)
      setError(null)
      return
    }
    if (!tokenAddress) {
      setIsLoading(false)
      setError('No token selected')
      setCandles([])
      return
    }
    setIsLoading(true)
  }, [externalData, tokenAddress])

  // Transform candles for chart display
  const chartData = useMemo(() => {
    if (candles.length === 0) return []
    
    return candles.map((candle) => {
      const date = new Date(candle.time * 1000)
      
      return {
        timestamp: candle.time * 1000,
        price: candle.close,
        marketCap: candle.close,
        volume: candle.volume,
        time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
      }
    })
  }, [candles])

  // Calculate metrics
  const metrics = useMemo(() => {
    if (candles.length === 0) {
      return {
        currentPrice: 0,
        open: 0,
        high: 0,
        low: 0,
        close: 0,
        priceWaifuge: 0,
        priceWaifugePercent: 0,
        volume24h: 0,
        high24h: 0,
        low24h: 0
      }
    }

    const first = candles[0]
    const last = candles[candles.length - 1]
    const allHighs = candles.map(c => c.high)
    const allLows = candles.map(c => c.low)
    const allVolumes = candles.map(c => c.volume)

    return {
      currentPrice: last.close,
      open: first.open,
      high: Math.max(...allHighs),
      low: Math.min(...allLows),
      close: last.close,
      priceWaifuge: last.close - first.open,
      priceWaifugePercent: ((last.close - first.open) / first.open) * 100,
      volume24h: allVolumes.reduce((a, b) => a + b, 0),
      high24h: Math.max(...allHighs),
      low24h: Math.min(...allLows),
    }
  }, [candles])

  const isPositive = metrics.priceWaifugePercent >= 0

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-black/90 border border-gray-700 rounded-lg p-3 text-white text-xs">
          <div className="flex justify-between gap-4 mb-2">
            <span>Price:</span>
            <span className="font-mono">${data.close.toFixed(6)}</span>
          </div>
          <div className="flex justify-between gap-4 mb-2">
            <span>High:</span>
            <span className="font-mono">${data.high.toFixed(6)}</span>
          </div>
          <div className="flex justify-between gap-4 mb-2">
            <span>Low:</span>
            <span className="font-mono">${data.low.toFixed(6)}</span>
          </div>
          <div className="flex justify-between gap-4 mb-2">
            <span>Volume:</span>
            <span className="font-mono">{formatNumber(data.volume || 0)}</span>
          </div>
          <div className="text-gray-400 mt-2 pt-2 border-t border-gray-700">{data.time}</div>
        </div>
      )
    }
    return null
  }

  if (isLoading) {
    return (
      <div className="h-[300px] flex items-center justify-center bg-card rounded-xl border border-border">
        <div className="text-muted-foreground text-sm">Loading chart from DexScreener...</div>
      </div>
    )
  }

  if (error || chartData.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center bg-card rounded-xl border border-border">
        <div className="text-muted-foreground text-sm">{error || 'No chart data available'}</div>
      </div>
    )
  }

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-1">Price Chart (DexScreener)</h3>
          {currentMC !== null && (
            <p className="text-2xl font-bold text-primary">{formatNumber(currentMC)}</p>
          )}
          <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
            <span>O: {formatNumber(metrics.open)}</span>
            <span>H: {formatNumber(metrics.high24h)}</span>
            <span>L: {formatNumber(metrics.low24h)}</span>
            <span>C: {formatNumber(metrics.close)}</span>
            <span className={isPositive ? 'text-green-500' : 'text-red-500'}>
              {isPositive ? '+' : ''}{metrics.priceWaifugePercent.toFixed(2)}%
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          {([
            { value: '15m' as const, label: '15M' },
            { value: '1h' as const, label: '1H' },
            { value: '4h' as const, label: '4H' },
            { value: '1d' as const, label: '1D' },
          ]).map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setTimeframe(value)}
              className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                timeframe === value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
          <XAxis 
            dataKey="time" 
            hide
            tickCount={5}
            interval="preserveStartEnd"
          />
          <YAxis 
            hide
            domain={['auto', 'auto']}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="close"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: 'hsl(var(--primary))' }}
          />
          <Line
            type="monotone"
            dataKey="high"
            stroke="rgba(255, 255, 255, 0.2)"
            strokeWidth={1}
            dot={false}
            strokeDasharray="3 3"
          />
          <Line
            type="monotone"
            dataKey="low"
            stroke="rgba(255, 255, 255, 0.2)"
            strokeWidth={1}
            dot={false}
            strokeDasharray="3 3"
          />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="mt-4 pt-4 border-t border-border">
        <div className="text-xs text-muted-foreground mb-2">Volume: {formatNumber(metrics.volume24h)}</div>
        <ResponsiveContainer width="100%" height={60}>
          <ComposedChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <XAxis dataKey="time" hide />
            <YAxis hide />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="volume" fill="rgba(0, 174, 239, 0.25)" radius={0} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}