'use client'

import React, { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceArea,
  ResponsiveContainer
} from 'recharts'

interface TimelineDataPoint {
  date: string
  cholesterol: number
  systolic: number
  diastolic: number
  weight: number
  isPrediction?: boolean
}

interface BiomarkerTimelineChartProps {
  data: TimelineDataPoint[]
  metric: 'cholesterol' | 'bp' | 'weight'
}

export function BiomarkerTimelineChart({ data, metric }: BiomarkerTimelineChartProps) {
  
  // Dynamic zones based on metric
  const zones = useMemo(() => {
    if (metric === 'cholesterol') {
      return [
        { y1: 0, y2: 130, color: 'rgba(16, 185, 129, 0.08)' }, // Optimal
        { y1: 130, y2: 160, color: 'rgba(245, 158, 11, 0.08)' }, // Borderline
        { y1: 160, y2: 300, color: 'rgba(239, 68, 68, 0.08)' }  // Elevated
      ]
    }
    if (metric === 'bp') {
      return [
        { y1: 60, y2: 120, color: 'rgba(16, 185, 129, 0.08)' }, // Optimal
        { y1: 120, y2: 140, color: 'rgba(245, 158, 11, 0.08)' }, // Borderline
        { y1: 140, y2: 200, color: 'rgba(239, 68, 68, 0.08)' } // Elevated
      ]
    }
    // Weight depends on height but using static boundaries here for demo
    return [
      { y1: 60, y2: 83, color: 'rgba(16, 185, 129, 0.08)' },
      { y1: 83, y2: 90, color: 'rgba(245, 158, 11, 0.08)' },
      { y1: 90, y2: 150, color: 'rgba(239, 68, 68, 0.08)' }
    ]
  }, [metric])

  const formatTooltip = (value: number, name: string) => {
    if (name === 'cholesterol') return [`${value} mg/dL`, 'Cholesterol']
    if (name === 'systolic') return [`${value}`, 'Systolic BP']
    if (name === 'diastolic') return [`${value}`, 'Diastolic BP']
    if (name === 'weight') return [`${value} kg`, 'Weight']
    return [value, name]
  }

  // Pre-process data so that solid and dashed lines overlap exactly and don't look weird
  // If we want solid and dashed on the same series, Recharts requires a custom dot or split series.
  // The easiest way is to push mapping onto different keys.
  const chartData = useMemo(() => {
    return data.map(d => {
      const isPred = d.isPrediction
      return {
        date: d.date,
        cholesterol_hist: isPred ? null : d.cholesterol,
        cholesterol_pred: isPred && d.cholesterol ? d.cholesterol : null,
        
        systolic_hist: isPred ? null : d.systolic,
        systolic_pred: isPred && d.systolic ? d.systolic : null,
        
        diastolic_hist: isPred ? null : d.diastolic,
        diastolic_pred: isPred && d.diastolic ? d.diastolic : null,
        
        weight_hist: isPred ? null : d.weight,
        weight_pred: isPred && d.weight ? d.weight : null,
      }
    })
  }, [data])

  return (
    <div className="w-full h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
          <XAxis 
            dataKey="date" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
            dy={10}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false}
            tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
            domain={['auto', 'auto']}
          />
          <Tooltip 
            formatter={formatTooltip}
            contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
          />
          <Legend wrapperStyle={{ paddingTop: '20px' }} />
          
          {zones.map((zone, i) => (
            <ReferenceArea key={i} y1={zone.y1} y2={zone.y2} fill={zone.color} strokeOpacity={0} />
          ))}

          {metric === 'cholesterol' && (
            <>
              <Line type="monotone" dataKey="cholesterol_hist" name="Cholesterol (Historical)" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} connectNulls />
              <Line type="monotone" dataKey="cholesterol_pred" name="Cholesterol (Predicted)" stroke="#3b82f6" strokeWidth={3} strokeDasharray="5 5" dot={{ r: 4 }} connectNulls />
            </>
          )}

          {metric === 'bp' && (
            <>
              <Line type="monotone" dataKey="systolic_hist" name="Systolic (Historical)" stroke="#db2777" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} connectNulls />
              <Line type="monotone" dataKey="systolic_pred" name="Systolic (Predicted)" stroke="#db2777" strokeWidth={3} strokeDasharray="5 5" dot={{ r: 4 }} connectNulls />
              
              <Line type="monotone" dataKey="diastolic_hist" name="Diastolic (Historical)" stroke="#9333ea" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} connectNulls />
              <Line type="monotone" dataKey="diastolic_pred" name="Diastolic (Predicted)" stroke="#9333ea" strokeWidth={3} strokeDasharray="5 5" dot={{ r: 4 }} connectNulls />
            </>
          )}

          {metric === 'weight' && (
            <>
              <Line type="monotone" dataKey="weight_hist" name="Weight (Historical)" stroke="#14b8a6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} connectNulls />
              <Line type="monotone" dataKey="weight_pred" name="Weight (Predicted)" stroke="#14b8a6" strokeWidth={3} strokeDasharray="5 5" dot={{ r: 4 }} connectNulls />
            </>
          )}

        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
