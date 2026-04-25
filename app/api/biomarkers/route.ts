/**
 * GET /api/biomarkers?id=<patientId>
 *
 * Returns the key clinical biomarkers used for the Future Timeline projection.
 * Server-only: queries SQLite directly via getClinicalSummary.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getClinicalSummary } from '@/lib/db/clinicalSummary'
import { getFirstPatient } from '@/lib/db/patientContext'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  let patientId = searchParams.get('id') ?? null

  try {
    // If no id given, fall back to first patient
    if (!patientId) {
      const first = getFirstPatient()
      if (!first) {
        return NextResponse.json({ error: 'No patients found' }, { status: 503 })
      }
      patientId = first.id
    }

    const summary = getClinicalSummary(patientId)

    const biomarkers = {
      patientId,
      firstName: summary.demographics.firstName,
      lastName: summary.demographics.lastName,
      age: summary.demographics.age,
      gender: summary.demographics.gender,
      ldl: summary.latestLabs.ldl?.value ?? null,
      hdl: summary.latestLabs.hdl?.value ?? null,
      systolicBP: summary.latestVitals.systolic_bp?.value ?? null,
      diastolicBP: summary.latestVitals.diastolic_bp?.value ?? null,
      weight: summary.latestVitals.weight?.value ?? null,
      bmi: summary.latestVitals.bmi?.value ?? null,
      glucose: summary.latestLabs.glucose?.value ?? null,
      hba1c: summary.latestLabs.hba1c?.value ?? null,
      cardiovascularRiskFactors: summary.cardiovascularRiskFactors,
    }

    return NextResponse.json(biomarkers)
  } catch (error: any) {
    const isEmptyDB = error.message?.includes('No Synthea patients found')
    return NextResponse.json({ error: error.message }, { status: isEmptyDB ? 503 : 500 })
  }
}
