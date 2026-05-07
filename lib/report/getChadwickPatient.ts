import { listPatients, type SyntheaPatientSummary } from '@/lib/db/patientContext'

export async function findChadwickPatientSummary(): Promise<SyntheaPatientSummary | null> {
  const patients = await listPatients({ limit: 500 })
  return patients.find(p => `${p.firstName} ${p.lastName}`.toLowerCase().includes('chadwick')) ?? null
}
