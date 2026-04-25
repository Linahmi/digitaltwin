import { ReportDashboardClient } from '@/components/profile/ReportDashboardClient'
import { getChadwickDashboardData } from '@/lib/report/getChadwickDashboardData'

export default function ReportPage() {
  const data = getChadwickDashboardData()

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-950 px-6 py-16 text-white">
        <div className="mx-auto max-w-3xl rounded-[32px] border border-white/10 bg-white/5 p-10 backdrop-blur-xl">
          <h1 className="text-3xl font-semibold">Report unavailable</h1>
          <p className="mt-3 text-sm text-slate-300">Chadwick was not found in the local Synthea database.</p>
        </div>
      </div>
    )
  }

  return <ReportDashboardClient data={data} />
}
