/**
 * GET /api/patients
 * GET /api/patients?condition=Diabetes&minAge=50&maxAge=70&gender=female&limit=20
 *
 * Returns a list of patients from the Synthea SQLite database.
 * If the database is empty, returns 503 with a setup message.
 */

import { NextRequest, NextResponse } from 'next/server'
import { listPatients } from '@/lib/db/patientContext'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const condition = searchParams.get('condition') ?? undefined
  const minAge    = searchParams.has('minAge') ? parseInt(searchParams.get('minAge')!) : undefined
  const maxAge    = searchParams.has('maxAge') ? parseInt(searchParams.get('maxAge')!) : undefined
  const gender    = searchParams.get('gender') ?? undefined
  const limit     = searchParams.has('limit')  ? parseInt(searchParams.get('limit')!)  : 100

  try {
    const patients = listPatients({ condition, minAge, maxAge, gender, limit })
    return NextResponse.json({ patients, count: patients.length })
  } catch (error: any) {
    const isEmptyDB = error.message?.includes('No Synthea patients found')
    return NextResponse.json(
      { error: error.message },
      { status: isEmptyDB ? 503 : 500 }
    )
  }
}
