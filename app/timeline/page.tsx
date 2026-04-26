'use client'

import { useEffect, useState } from 'react'
import { TopNav } from '@/components/TopNav'
import { BiomarkerTimelineChart } from '@/components/timeline/BiomarkerTimelineChart'

type MetricKey = 'cholesterol' | 'blood_pressure' | 'weight'

export default function TimelinePage() {
  const [data, setData] = useState<any>(null)
  const [metric, setMetric] = useState<MetricKey>('cholesterol')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/timeline')
      .then(res => {
        if (!res.ok) throw new Error(`Timeline API error ${res.status}`)
        return res.json()
      })
      .then(json => {
        setData(json.biomarkers)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const handleTabClick = (key: MetricKey) => setMetric(key)

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-gray-50">
        <TopNav />
        <div className="flex items-center justify-center pt-24 text-gray-400 font-medium">
          <div className="flex flex-col items-center gap-3">
            <div className="h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs uppercase tracking-widest">Loading Analytics...</span>
          </div>
        </div>
      </div>
    )
  }

  const chartData = data[metric]

  // Sidebar dynamic content
  const tabInfo: Record<MetricKey, { text: string, conf: number }> = {
    cholesterol: {
      text: "LDL levels showed marked improvement following the initiation of pharmacological intervention in Q3 2022. The current longitudinal trajectory indicates stabilization within acceptable clinical parameters, though remains 12% above the optimal primary prevention target. Adherence to the current regimen is recommended to mitigate residual cardiovascular risk.",
      conf: 82
    },
    blood_pressure: {
      text: "Systolic blood pressure metrics demonstrate a positive response to antihypertensive therapy. However, the current mean plateau of 145 mmHg exceeds the clinical target of 130 mmHg. A titration of current dosage or supplementary lifestyle intervention may be warranted to achieve target hemodynamic stability.",
      conf: 74
    },
    weight: {
      text: "Body mass index tracking indicates a sustained upward trend that may exacerbate metabolic dysfunction over the 60-month projection horizon. This linear escalation shows a statistically significant correlation with the observed blood pressure plateau. Targeted weight management is a primary clinical priority.",
      conf: 89
    }
  }

  const analysis = tabInfo[metric]

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNav />
      
      <main className="max-w-[1400px] mx-auto px-8 py-10">
        
        {/* Page Header */}
        <div className="mb-10">
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Biomarker Analytics</h1>
          <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">
            Longitudinal telemetry analysis and AI-driven 5-year physiological projections.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 mb-10 bg-gray-100/50 p-1 rounded-lg w-fit border border-gray-200">
          {[
            { key: 'cholesterol', label: 'Cholesterol' },
            { key: 'blood_pressure', label: 'Blood Pressure' },
            { key: 'weight', label: 'Weight' }
          ].map((item) => (
            <button 
              key={item.key}
              onClick={() => handleTabClick(item.key as MetricKey)}
              className={`px-5 py-2 text-xs font-semibold uppercase tracking-wider rounded-md transition-all duration-200 ${
                metric === item.key 
                ? 'bg-white text-blue-600 shadow-sm border border-gray-200' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Analytics Grid */}
        <div className="grid grid-cols-3 gap-8">
          
          {/* Main Analytics Card */}
          <div className="col-span-2 bg-white rounded-2xl border border-gray-200 p-10 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
            <div className="mb-8">
              <div className="text-[12px] font-bold uppercase tracking-[0.1em] text-gray-400 mb-1">Telemetry Monitor</div>
              <h2 className="text-2xl font-bold text-gray-900">{chartData.label}</h2>
              <p className="text-sm text-gray-500 mt-0.5">Unit of measurement: {chartData.unit}</p>
            </div>
            
            <BiomarkerTimelineChart data={chartData} />
          </div>

          {/* AI Analysis Card */}
          <div className="flex flex-col gap-6">
            <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
              <h3 className="text-[12px] font-bold uppercase tracking-[0.1em] text-gray-500 mb-6">AI Projection Analysis</h3>
              
              <div className="space-y-6">
                <p className="text-sm text-gray-700 font-normal leading-relaxed">
                  {analysis.text}
                </p>

                <div className="pt-6 border-t border-gray-100">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Trajectory Confidence</span>
                    <span className="text-sm font-bold text-gray-900">{analysis.conf}%</span>
                  </div>
                  <div className="h-2 w-full bg-gray-100 overflow-hidden rounded-full border border-gray-200/50">
                    <div 
                      className="h-full bg-blue-500 transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(59,130,246,0.3)]" 
                      style={{ width: `${analysis.conf}%` }} 
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Evidence Insight Card (Optional extra for professional feel) */}
            <div className="bg-blue-50/50 rounded-2xl border border-blue-100/50 p-6">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-blue-600 mb-2">Clinical Note</h4>
              <p className="text-[12px] leading-relaxed text-blue-800/80">
                Data synchronized from hospital EHR systems. Projections are based on current treatment adherence and historical metabolic drift.
              </p>
            </div>
          </div>

        </div>

      </main>
    </div>
  )
}
