import { listPatients, type SyntheaPatientSummary } from '@/lib/db/patientContext'

export function findChadwickPatientSummary(): SyntheaPatientSummary | null {
  return (
    listPatients({ limit: 500 }).find((patient) =>
      `${patient.firstName} ${patient.lastName}`.toLowerCase().includes('chadwick')
    ) ?? null
  )
}
