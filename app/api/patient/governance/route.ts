import { NextRequest, NextResponse } from 'next/server'
import { getPatientSummary, getFirstPatient } from '@/lib/db/patientContext'
import { findChadwickPatientSummary } from '@/lib/report/getChadwickPatient'
import { getGovernanceLogs, getGeneticSyncStatus } from '@/lib/db/governance'

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
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    }

    const [logs, syncStatus] = await Promise.all([
      getGovernanceLogs(patient.id),
      getGeneticSyncStatus(patient.id)
    ])

    return NextResponse.json({
      patientId: patient.id,
      logs,
      syncStatus,
      updatedAt: new Date().toISOString()
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
