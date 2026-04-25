'use client'

import { useState, useEffect } from 'react'
import { TopNav } from '@/components/TopNav'
import { BiomarkerTimelineChart } from '@/components/timeline/BiomarkerTimelineChart'
import { Brain, TrendingUp } from 'lucide-react'

// Map API shape to Chart shape
interface TimelinePoint {
  date: string
  cholesterol: number
  systolic: number
  diastolic: number
  weight: number
  isPrediction?: boolean
}

export default function TimelinePage() {
  const [metric, setMetric] = useState<'cholesterol' | 'bp' | 'weight'>('cholesterol')
  const [data, setData] = useState<TimelinePoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/timeline')
      .then(r => r.json())
      .then(res => {
        const hist: TimelinePoint[] = res.historical.map((d: any) => ({ ...d, isPrediction: false }))
        const pred: TimelinePoint[] = res.predicted.map((d: any) => ({ ...d, isPrediction: true }))
        
        // Remove the duplicate overlap point from history so react charting is seamless, or keep it.
        // Actually, to make lines connect smoothly in recharts between diff data keys, we need the exact transition point in BOTH arrays OR just graph the continuous timeline
        // The API returns overlap at 2025 in both arrays. We can keep both and let useMemo in chart handle it.
        
        setData([...hist, ...pred])
        setLoading(false)
      })
      .catch(e => {
        console.error(e)
        setLoading(false)
      })
  }, [])

  const getInsightText = () => {
    switch (metric) {
      case 'cholesterol':
        return "LDL improved significantly after beginning statin therapy in 2022. The downward trend is expected to stabilize but remains slightly elevated. Continued adherence is necessary to reach optimal targets."
      case 'bp':
        return "Systolic pressure has lowered to the borderline/elevated threshold. Predictive models suggest it will remain elevated unless additional lifestyle modifications or therapeutic adjustments occur."
      case 'weight':
        return "Weight is trending upward and may increase metabolic risk over the next 5 years. This linear trajectory strongly correlates with the plateauing blood pressure."
      default:
        return ""
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans selection:bg-blue-100 selection:text-blue-900">
      <TopNav />
      
      <main className="max-w-[1400px] mx-auto px-6 md:px-12 pt-12 pb-32">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-slate-800">Biomarker Timeline</h1>
          <p className="text-slate-500 font-medium mt-1">Historical trends and predicted future trajectory</p>
        </div>

        {/* Controls */}
        <div className="flex gap-3 mb-8 border-b border-slate-200 pb-4">
          <button 
            onClick={() => setMetric('cholesterol')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${metric === 'cholesterol' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}
          >
            Cholesterol
          </button>
          <button 
            onClick={() => setMetric('bp')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${metric === 'bp' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}
          >
            Blood Pressure
          </button>
          <button 
            onClick={() => setMetric('weight')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${metric === 'weight' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}
          >
            Weight
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <span className="text-slate-400 font-medium">Loading clinical models...</span>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Chart Area */}
            <div className="flex-1 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center gap-2 text-xs font-semibold tracking-wide uppercase text-slate-500">
                  <span className="w-4 h-1 bg-slate-300 rounded block" /> Historical
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold tracking-wide uppercase text-slate-500">
                  <span className="w-4 h-1 border-t-2 border-dashed border-slate-400 block" /> Predicted
                </div>
              </div>
              <BiomarkerTimelineChart data={data} metric={metric} />
            </div>

            {/* Sidebar Insight */}
            <div className="lg:w-80 flex-shrink-0">
              <div className="bg-gradient-to-b from-blue-50/50 to-transparent rounded-3xl p-6 border border-blue-100/50 h-full">
                <div className="flex items-center gap-2 mb-4">
                  <Brain className="h-5 w-5 text-blue-600" />
                  <h3 className="font-bold text-slate-800 tracking-tight">AI Projection Analysis</h3>
                </div>
                
                <p className="text-slate-600 leading-relaxed font-medium">
                  {getInsightText()}
                </p>

                <div className="mt-8 p-4 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-start gap-4">
                  <TrendingUp className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">Trajectory Confidence</h4>
                    <p className="text-xs text-slate-500 font-medium mt-1">Based on patient demographic, historical adherence, and standard therapeutic pipelines.</p>
                    <div className="mt-3 flex items-center gap-2">
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="w-[82%] h-full bg-blue-500 rounded-full" />
                      </div>
                      <span className="text-xs font-bold text-slate-600">82%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
