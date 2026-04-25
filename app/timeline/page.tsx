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
      .then(res => res.json())
      .then(json => {
        setData(json.biomarkers)
        setLoading(false)
      })
  }, [])

  const handleTabClick = (key: MetricKey) => setMetric(key)

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <TopNav />
        <div className="flex items-center justify-center pt-20 text-[#888]">Loading analytics...</div>
      </div>
    )
  }

  const chartData = data[metric]

  // Sidebar dynamic content
  const tabInfo: Record<MetricKey, { text: string, conf: number }> = {
    cholesterol: {
      text: "LDL improved significantly after beginning statin therapy in 2022. The downward trend is expected to stabilize but remains slightly elevated. Continued adherence is necessary to reach optimal targets.",
      conf: 82
    },
    blood_pressure: {
      text: "Systolic BP responded well to antihypertensive therapy. Current plateau around 145 mmHg suggests medication adjustment may be needed to reach the 130 mmHg target.",
      conf: 74
    },
    weight: {
      text: "Weight is trending upward and may increase metabolic risk over the next 5 years. This linear trajectory strongly correlates with the plateauing blood pressure.",
      conf: 89
    }
  }

  const analysis = tabInfo[metric]

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      <TopNav />
      
      <main className="max-w-[1400px] mx-auto px-6 md:px-12 pt-8">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-medium text-[#1a1a1a]">Biomarker Timeline</h1>
          <p className="text-sm text-[#888] mt-1">Historical telemetry and AI-driven 5-year longitudinal projection.</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-3 mb-8">
          <button 
            onClick={() => handleTabClick('cholesterol')}
            className={`rounded-full px-4 py-2 text-sm transition-colors ${metric === 'cholesterol' ? 'bg-blue-600 text-white' : 'border border-[#E5E5E5] text-[#555] hover:bg-[#F5F5F5]'}`}
          >
            Cholesterol
          </button>
          <button 
            onClick={() => handleTabClick('blood_pressure')}
            className={`rounded-full px-4 py-2 text-sm transition-colors ${metric === 'blood_pressure' ? 'bg-blue-600 text-white' : 'border border-[#E5E5E5] text-[#555] hover:bg-[#F5F5F5]'}`}
          >
            Blood Pressure
          </button>
          <button 
            onClick={() => handleTabClick('weight')}
            className={`rounded-full px-4 py-2 text-sm transition-colors ${metric === 'weight' ? 'bg-blue-600 text-white' : 'border border-[#E5E5E5] text-[#555] hover:bg-[#F5F5F5]'}`}
          >
            Weight
          </button>
        </div>

        {/* Content Layout */}
        <div className="flex flex-col lg:flex-row gap-6">
          
          {/* Main Chart Area */}
          <div className="flex-1 bg-white border border-[#E5E5E5] rounded-lg p-6">
            <div className="mb-6">
              <h2 className="text-lg font-medium text-[#1a1a1a]">{chartData.label}</h2>
              <p className="text-sm text-[#999]">Unit: {chartData.unit}</p>
            </div>
            
            <BiomarkerTimelineChart data={chartData} />
          </div>

          {/* Sidebar Analysis */}
          <div className="w-full lg:w-[350px] shrink-0">
            <div className="bg-white border border-[#E5E5E5] rounded-lg p-5">
              <h3 className="text-xs font-medium uppercase tracking-widest text-[#999] mb-4">AI Projection Analysis</h3>
              
              <p className="text-sm text-[#555] font-normal leading-relaxed mb-6">
                {analysis.text}
              </p>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-medium text-[#888]">Trajectory Confidence</span>
                  <span className="text-xs font-medium text-[#1a1a1a]">{analysis.conf}%</span>
                </div>
                <div className="h-[3px] w-full bg-[#F0F0F0] overflow-hidden rounded-none">
                  <div className="h-full bg-blue-500" style={{ width: `${analysis.conf}%` }} />
                </div>
              </div>
            </div>
          </div>

        </div>

      </main>
    </div>
  )
}
