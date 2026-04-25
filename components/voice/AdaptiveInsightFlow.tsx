'use client'

import { Domain, PatientSnapshot } from './domainConfig'
import { HealthDashboard } from './HealthDashboard'

export interface AdaptiveInsightFlowProps {
  domain:               Domain
  snapshot:             PatientSnapshot | null
  isActivelySpeaking?:  boolean
  fullText?:            string
}

export function AdaptiveInsightFlow({ domain, snapshot, isActivelySpeaking = false, fullText = '' }: AdaptiveInsightFlowProps) {
  return (
    <HealthDashboard
      domain={domain}
      snapshot={snapshot}
      isActivelySpeaking={isActivelySpeaking}
      fullText={fullText}
    />
  )
}
