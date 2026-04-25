/**
 * GET /api/patient?id=<patientId>
 *
 * Returns a single patient's summary (name, age, gender).
 * Used by the voice page to populate the header without sending
 * the full context payload.
 *
 * If id is omitted, returns the first patient in the database.
 * Returns 503 if the database is empty.
 * Returns 404 if the patient id is not found.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getPatientSummary, getFirstPatient } from '@/lib/db/patientContext'
import { findChadwickPatientSummary } from '@/lib/report/getChadwickPatient'
import { buildPatientDisplayName } from '@/lib/report/patientDisplayName'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id') ?? undefined
  const preset = searchParams.get('preset')

  try {
    const patient =
      id
        ? getPatientSummary(id)
        : preset === 'chadwick'
          ? findChadwickPatientSummary()
          : getFirstPatient()

    if (!patient) {
      return NextResponse.json(
        { error: `Patient not found: ${id ?? preset ?? 'default'}` },
        { status: 404 }
      )
    }

    const display = buildPatientDisplayName(patient.firstName, patient.lastName)

    return NextResponse.json({
      ...patient,
      ...display,
    })
  } catch (error: any) {
    const isEmptyDB = error.message?.includes('No Synthea patients found')
    return NextResponse.json(
      { error: error.message },
      { status: isEmptyDB ? 503 : 500 }
    )
  }
}
