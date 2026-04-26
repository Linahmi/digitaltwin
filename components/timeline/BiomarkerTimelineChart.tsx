'use client'

import React, { useMemo } from 'react'

interface DataPoint {
  date: string
  value: number | null
}

interface BiomarkerChartProps {
  data: {
    historical: DataPoint[]
    predicted: DataPoint[]
    zones: { 
      optimal: [number, number]
      borderline: [number, number]
      elevated: [number, number] 
    }
    unit?: string
    targetLabel?: string
  }
}

/**
 * A medical-grade, data-first biomarker chart implemented using raw SVG 
 * for maximum stylistic control. Part of the Dualis design system.
 */
export function BiomarkerTimelineChart({ data }: BiomarkerChartProps) {
  // SVG Dimensions & Padding
  const width = 800
  const height = 400
  const padding = { top: 40, right: 40, bottom: 40, left: 50 }

  // Combine all points to find scaling factors
  const allPoints = [...data.historical, ...data.predicted].filter(p => p.value !== null)
  const values = allPoints.map(p => p.value as number)

  if (values.length === 0) {
    return <div className="flex h-[200px] items-center justify-center text-sm text-gray-400">No data available</div>
  }

  const minVal = Math.min(...values)
  const maxVal = Math.max(...values)
  const range = maxVal - minVal
  
  // Buffers for axis scaling
  const yMin = Math.max(0, Math.floor(minVal - range * 0.2))
  const yMax = Math.ceil(maxVal + range * 0.2)
  const yRange = yMax - yMin

  // Coordinate conversion functions
  const getX = (index: number, total: number) => {
    return padding.left + (index / (total - 1)) * (width - padding.left - padding.right)
  }
  
  const getY = (val: number) => {
    return height - padding.bottom - ((val - yMin) / yRange) * (height - padding.top - padding.bottom)
  }

  // Generate paths
  const historicalPath = useMemo(() => {
    if (data.historical.length === 0) return ''
    return data.historical
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i, data.historical.length + data.predicted.length - 1)} ${getY(p.value as number)}`)
      .join(' ')
  }, [data.historical, data.predicted])

  const projectedPath = useMemo(() => {
    if (data.predicted.length === 0) return ''
    const startIdx = data.historical.length - 1
    const totalPoints = data.historical.length + data.predicted.length - 1
    
    // Start from the last historical point to ensure continuity
    const lastHist = data.historical[data.historical.length - 1]
    let path = `M ${getX(startIdx, totalPoints)} ${getY(lastHist.value as number)}`
    
    data.predicted.forEach((p, i) => {
      path += ` L ${getX(startIdx + i + 1, totalPoints)} ${getY(p.value as number)}`
    })
    return path
  }, [data.historical, data.predicted])

  // Area Path (Gradient fill)
  const areaPath = useMemo(() => {
    if (data.historical.length === 0) return ''
    const path = historicalPath
    const lastX = getX(data.historical.length - 1, data.historical.length + data.predicted.length - 1)
    const firstX = getX(0, data.historical.length + data.predicted.length - 1)
    const baselineY = getY(yMin)
    
    return `${path} L ${lastX} ${baselineY} L ${firstX} ${baselineY} Z`
  }, [historicalPath, data.historical, data.predicted, yMin])

  // Grid lines (y-axis)
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map(pct => {
    const val = yMin + pct * yRange
    const y = getY(val)
    return { y, val: Math.round(val) }
  })

  return (
    <div className="w-full">
      {/* Legend - Clean, horizontal layout */}
      <div className="flex items-center gap-8 mb-8">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#3b82f6]" />
          <span className="text-sm font-medium text-gray-600">Historical</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 bg-gray-400 border-t-2 border-dashed border-gray-400" />
          <span className="text-sm font-medium text-gray-600">Projected</span>
        </div>
        <div className="flex items-center gap-6 ml-auto">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#10b981]" />
            <span className="text-[12px] text-gray-500 font-medium uppercase tracking-wider">Optimal</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#f59e0b]" />
            <span className="text-[12px] text-gray-500 font-medium uppercase tracking-wider">Borderline</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#ef4444]" />
            <span className="text-[12px] text-gray-500 font-medium uppercase tracking-wider">Elevated</span>
          </div>
        </div>
      </div>

      <div className="relative bg-white">
        <svg 
          viewBox={`0 0 ${width} ${height}`} 
          className="w-full h-auto overflow-visible"
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Grid Lines */}
          {gridLines.map((line, i) => (
            <g key={i}>
              <line 
                x1={padding.left} 
                y1={line.y} 
                x2={width - padding.right} 
                y2={line.y} 
                stroke="#f3f4f6" 
                strokeWidth="1" 
              />
              <text 
                x={padding.left - 12} 
                y={line.y + 4} 
                textAnchor="end" 
                className="text-[11px] fill-gray-400 font-medium"
              >
                {line.val}
              </text>
            </g>
          ))}

          {/* Zones (Subtle background markers) */}
          <rect 
            x={padding.left} 
            y={getY(data.zones.optimal[1])} 
            width={width - padding.left - padding.right} 
            height={getY(data.zones.optimal[0]) - getY(data.zones.optimal[1])} 
            fill="#10b981" 
            fillOpacity="0.03" 
          />

          {/* Area Fill */}
          <path d={areaPath} fill="url(#chartGradient)" />

          {/* Historical Line */}
          <path 
            d={historicalPath} 
            fill="none" 
            stroke="#3b82f6" 
            strokeWidth="3" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />

          {/* Projected Line */}
          <path 
            d={projectedPath} 
            fill="none" 
            stroke="#9ca3af" 
            strokeWidth="2" 
            strokeDasharray="6 4" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />

          {/* Data Points */}
          {data.historical.map((p, i) => (
            <circle 
              key={i} 
              cx={getX(i, data.historical.length + data.predicted.length - 1)} 
              cy={getY(p.value as number)} 
              r="4" 
              fill="#3b82f6" 
              stroke="#ffffff" 
              strokeWidth="2" 
              className="drop-shadow-sm"
            />
          ))}

          {/* X-Axis Labels (Years/Dates) */}
          {[...data.historical, ...data.predicted].map((p, i) => (
            i % 2 === 0 && (
              <text 
                key={i} 
                x={getX(i, data.historical.length + data.predicted.length - 1)} 
                y={height - padding.bottom + 20} 
                textAnchor="middle" 
                className="text-[11px] fill-gray-400 font-medium"
              >
                {p.date}
              </text>
            )
          ))}

          {/* Target Line */}
          {data.targetLabel && (
            <line 
              x1={padding.left} 
              y1={getY(data.zones.optimal[1])} 
              x2={width - padding.right} 
              y2={getY(data.zones.optimal[1])} 
              stroke="#10b981" 
              strokeWidth="1" 
              strokeDasharray="4 2" 
              opacity="0.5"
            />
          )}
        </svg>
      </div>
    </div>
  )
}
