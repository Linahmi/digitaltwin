import { NextRequest, NextResponse } from 'next/server'
import { getPatientSummary, getFirstPatient } from '@/lib/db/patientContext'
import { findChadwickPatientSummary } from '@/lib/report/getChadwickPatient'
import { getPatientBiomarkers } from '@/lib/report/getPatientBiomarkers'
import { 
  calculateHeadIntegrity, 
  calculateChestIntegrity, 
  calculateMetabolicIntegrity 
} from '@/lib/risk/healthIndex'

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

    // Get current biomarkers
    const bm = await getPatientBiomarkers(patient.id)
    
    // Calculate scores
    const head = calculateHeadIntegrity(bm.systolicBP, bm.diastolicBP)
    const chest = calculateChestIntegrity(bm.heartRate, bm.ldl, bm.hdl)
    const metabolic = calculateMetabolicIntegrity(bm.glucose, bm.hba1c, bm.bmi)

    return NextResponse.json({
      patientId: patient.id,
      scores: {
        head,
        chest,
        metabolic,
        overall: Math.round((head + chest + metabolic) / 3)
      },
      updatedAt: new Date().toISOString()
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
