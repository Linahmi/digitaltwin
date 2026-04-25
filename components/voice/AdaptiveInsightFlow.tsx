'use client'

import { Domain, PatientSnapshot, DEFAULT_SNAPSHOT } from './domainConfig'
import { GuidedNarrationFlow } from './GuidedNarrationFlow'

export interface AdaptiveInsightFlowProps {
  domain:   Domain
  snapshot: PatientSnapshot | null
}

export function AdaptiveInsightFlow({ domain, snapshot }: AdaptiveInsightFlowProps) {
  return (
    <GuidedNarrationFlow
      domain={domain}
      snapshot={snapshot ?? DEFAULT_SNAPSHOT}
    />
  )
}
