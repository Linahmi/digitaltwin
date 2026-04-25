import Link from 'next/link'
import patientData from '@/public/patients/patient-001.json'
import { BiomarkerCard } from '@/components/profile/BiomarkerCard'
import { AIInsightCard } from '@/components/profile/AIInsightCard'
import { ConditionsList, Condition } from '@/components/profile/ConditionsList'
import { MedicationsList, Medication } from '@/components/profile/MedicationsList'
import { ConsentCard } from '@/components/web3/ConsentCard'
import { TopNav } from '@/components/TopNav'
import { Patient } from '@/types/patient'

const patient = patientData as unknown as Patient

export default function ProfilePage() {
  const { vitals, conditions, medications, first_name, last_name, date_of_birth } = patient
  
  const vitalsCards = [
    {
      label: 'Age',
      value: vitals.age,
      unit: 'yrs',
      status: 'optimal' as const,
      progress: 0
    },
    {
      label: 'BMI',
      value: vitals.bmi,
      unit: '',
      status: vitals.bmi >= 25 && vitals.bmi < 30 ? 'borderline' : vitals.bmi >= 30 ? 'elevated' : 'optimal' as const,
      progress: vitals.bmi >= 30 ? 85 : vitals.bmi >= 25 ? 65 : 45
    },
    {
      label: 'Blood Pressure',
      value: `${vitals.systolic_bp}/${vitals.diastolic_bp}`,
      unit: 'mmHg',
      status: vitals.systolic_bp > 140 || vitals.diastolic_bp > 90 ? 'elevated' : vitals.systolic_bp > 120 ? 'borderline' : 'optimal' as const,
      progress: vitals.systolic_bp > 140 ? 80 : vitals.systolic_bp > 120 ? 60 : 40
    },
    {
      label: 'Heart Rate',
      value: vitals.heart_rate,
      unit: 'bpm',
      status: vitals.heart_rate > 100 ? 'elevated' : vitals.heart_rate > 90 ? 'borderline' : 'optimal' as const,
      progress: vitals.heart_rate > 100 ? 90 : vitals.heart_rate > 90 ? 70 : 50
    },
    {
      label: 'LDL Chol.',
      value: vitals.ldl_cholesterol ?? 'N/A',
      unit: vitals.ldl_cholesterol ? 'mg/dL' : '',
      status: vitals.ldl_cholesterol ? (vitals.ldl_cholesterol >= 160 ? 'elevated' : vitals.ldl_cholesterol >= 130 ? 'borderline' : 'optimal') : 'optimal',
      progress: vitals.ldl_cholesterol ? (vitals.ldl_cholesterol / 2) : 50
    },
    {
      label: 'HDL Chol.',
      value: vitals.hdl_cholesterol ?? 'N/A',
      unit: vitals.hdl_cholesterol ? 'mg/dL' : '',
      status: vitals.hdl_cholesterol ? (vitals.hdl_cholesterol < 40 ? 'elevated' : vitals.hdl_cholesterol < 50 ? 'borderline' : 'optimal') : 'optimal',
      progress: vitals.hdl_cholesterol ? Math.max(10, 100 - (vitals.hdl_cholesterol)) : 50
    },
    {
      label: 'Glucose',
      value: vitals.glucose_fasting ?? 'N/A',
      unit: vitals.glucose_fasting ? 'mg/dL' : '',
      status: vitals.glucose_fasting ? (vitals.glucose_fasting >= 100 && vitals.glucose_fasting < 126 ? 'borderline' : vitals.glucose_fasting >= 126 ? 'elevated' : 'optimal') : 'optimal',
      progress: vitals.glucose_fasting ? Math.min(100, (vitals.glucose_fasting / 1.5)) : 50
    },
    {
      label: 'HbA1c',
      value: 'N/A', 
      unit: '%',
      status: 'monitor' as const,
      progress: 50
    }
  ]

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      <TopNav />
      
      <main className="max-w-[1400px] mx-auto px-6 md:px-12 pt-8">
        
        {/* Navigation & Header Section */}
        <div className="flex flex-col gap-5 mb-8">
          
          {/* Patient Header Row (Compact) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-[#F0F0F0] flex items-center justify-center">
                <span className="text-sm font-normal text-[#888]">{first_name[0]}{last_name[0]}</span>
              </div>
              <div>
                <h1 className="text-2xl font-medium text-[#1a1a1a]">
                  {first_name} {last_name}
                </h1>
                <p className="text-sm font-normal text-[#999]">
                  {vitals.age} years • {vitals.sex} • DOB: {date_of_birth}
                </p>
              </div>
            </div>
            
            <div className="text-left sm:text-right flex flex-col justify-end">
              <div className="flex items-baseline gap-1 justify-start sm:justify-end">
                <span className="text-4xl font-light text-[#1a1a1a]">78</span>
                <span className="text-sm font-normal text-[#999]">/100</span>
              </div>
            </div>
          </div>

          {/* AI Clinical Summary (Compact Box) */}
          <div className="bg-white rounded-lg p-5 border border-[#E5E5E5] flex flex-col">
            <h3 className="text-xs font-normal uppercase tracking-widest text-[#999] mb-2">AI Clinical Summary</h3>
            <p className="text-sm font-normal text-[#555] leading-relaxed">
              Patient metrics indicate stable core systems. Primary clinical finding focuses on elevated systolic blood pressure and borderline LDL cholesterol. Regular cardiovascular monitoring recommended.
            </p>
          </div>
          
          {/* AI Insight Cards (Horizontal Row) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <AIInsightCard 
              title="Cardiovascular"
              metric="14%"
              description="Slightly elevated 10-year risk profile. Consider statin intervention review."
              severity="elevated"
            />
            <AIInsightCard 
              title="Metabolic"
              metric="Borderline"
              description="BMI and fasting glucose trend requires periodic HbA1c review."
              severity="borderline"
            />
            <AIInsightCard 
              title="Systemic Inflammation"
              metric="Optimal"
              description="Inflammation markers currently exist within healthy standard thresholds."
              severity="optimal"
            />
          </div>

        </div>

        {/* Action Button & Telemetry Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-10 mb-5 gap-4">
          <h2 className="text-sm font-medium text-[#1a1a1a]">Biomarker Telemetry</h2>
          <Link href="/timeline" className="border border-[#E5E5E5] rounded-lg px-4 py-2 text-sm font-normal text-[#555] hover:bg-[#F5F5F5] transition-colors">
            View Timeline
          </Link>
        </div>

        {/* Biomarkers Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {vitalsCards.map((vital, idx) => (
            <BiomarkerCard 
              key={idx}
              label={vital.label}
              value={vital.value}
              unit={vital.unit}
              status={vital.status as "optimal" | "borderline" | "elevated" | "monitor"}
              progress={vital.progress}
            />
          ))}
        </section>

        {/* Conditions & Medications */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
          <div className="h-[300px]">
            <ConditionsList conditions={(conditions || []) as Condition[]} />
          </div>
          <div className="h-[300px]">
            <MedicationsList medications={(medications || []) as Medication[]} />
          </div>
        </section>

        {/* Web3 Consent Layer */}
        <section className="mb-8">
          <ConsentCard />
        </section>

      </main>
    </div>
  )
}
