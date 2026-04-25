/**
 * GET /api/biomarkers?id=<patientId>
 *
 * Returns the key clinical biomarkers used for the Future Timeline projection.
 * Server-only: queries SQLite directly via getClinicalSummary.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getClinicalSummary } from '@/lib/db/clinicalSummary'
import { getFirstPatient } from '@/lib/db/patientContext'
import { findChadwickPatientSummary } from '@/lib/report/getChadwickPatient'
import { buildPatientDisplayName } from '@/lib/report/patientDisplayName'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  let patientId = searchParams.get('id') ?? null
  const preset = searchParams.get('preset')

  try {
    // If no id given, prefer an explicit preset before falling back to the first patient.
    if (!patientId) {
      const selectedPatient =
        preset === 'chadwick'
          ? findChadwickPatientSummary()
          : getFirstPatient()

      if (!selectedPatient) {
        return NextResponse.json({ error: 'No patients found' }, { status: 503 })
      }
      patientId = selectedPatient.id
    }

    const summary = getClinicalSummary(patientId)
    const display = buildPatientDisplayName(summary.demographics.firstName, summary.demographics.lastName)

    const biomarkers = {
      patientId,
      firstName: display.firstName,
      lastName: display.lastName,
      displayName: display.displayName,
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
