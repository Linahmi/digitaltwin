'use client'

import { Domain, PatientSnapshot } from './domainConfig'
import { HealthDashboard } from './HealthDashboard'

export interface AdaptiveInsightFlowProps {
  domain:   Domain
  snapshot: PatientSnapshot | null
}

export function AdaptiveInsightFlow({ domain, snapshot }: AdaptiveInsightFlowProps) {
  return <HealthDashboard domain={domain} snapshot={snapshot} />
}
