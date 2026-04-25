/**
 * lib/db/clinicalSummary.ts
 *
 * Transforms raw Synthea FHIR data into a normalized, time-aware,
 * clinically meaningful patient summary.
 */

import db from './sqlite'
import { normalizeObservationKey, ClinicalMetricKey } from './clinicalMappings'

export interface ClinicalSummary {
  demographics: any;
  latestVitals: Record<string, any>;
  latestLabs: Record<string, any>;
  trends: Record<string, any>;
  activeConditions: any[];
  currentMedications: any[];
  allergies: any[];
  encounters: any[];
  cardiovascularRiskFactors: string[];
  metabolicRiskFactors: string[];
  missingData: string[];
  dataQualityNotes: string[];
}

// Helper to calculate age
function calcAge(birthDate: string | null): number | null {
  if (!birthDate) return null
  const birth = new Date(birthDate)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

function processTrends(observations: any[], metricKey: ClinicalMetricKey) {
  // Filter by metricKey
  const metricObs = observations.filter(o => o.normalizedKey === metricKey)
    .sort((a, b) => new Date(b.effective_date).getTime() - new Date(a.effective_date).getTime());

  if (metricObs.length === 0) return null;

  const latest = metricObs[0];
  const now = new Date().getTime();
  
  let abnormalValuesCount = 0;
  let abnormalRecentCount = 0;

  // Thresholds for abnormality (simplified for trend analysis)
  const isAbnormal = (val: number) => {
    switch(metricKey) {
      case 'systolic_bp': return val >= 130;
      case 'diastolic_bp': return val >= 80;
      case 'ldl': return val >= 130;
      case 'triglycerides': return val >= 150;
      case 'glucose': return val >= 100;
      case 'hba1c': return val >= 5.7;
      case 'bmi': return val >= 25;
      default: return false;
    }
  };

  metricObs.forEach(o => {
    if (o.value !== null && isAbnormal(o.value)) {
      abnormalValuesCount++;
      const monthsAgo = (now - new Date(o.effective_date).getTime()) / (1000 * 60 * 60 * 24 * 30);
      if (monthsAgo <= 3) abnormalRecentCount++;
    }
  });

  const previousValuesCount = metricObs.length - 1;
  let trendDirection = 'stable';
  if (metricObs.length > 1 && metricObs[0].value !== null && metricObs[1].value !== null) {
      if (metricObs[0].value > metricObs[1].value * 1.05) trendDirection = 'worsening (increasing)';
      else if (metricObs[0].value < metricObs[1].value * 0.95) trendDirection = 'improving (decreasing)';
  } else if (metricObs.length === 1) {
      trendDirection = 'insufficient data';
  }

  let historicalPattern = 'insufficient history';
  if (previousValuesCount > 0) {
      if (abnormalValuesCount === metricObs.length) historicalPattern = 'persistently elevated';
      else if (isAbnormal(latest.value) && abnormalValuesCount === 1) historicalPattern = 'single abnormal value';
      else if (!isAbnormal(latest.value) && abnormalValuesCount > 0) historicalPattern = 'currently normal but previously elevated';
      else if (isAbnormal(latest.value) && abnormalRecentCount > 0) historicalPattern = 'recently elevated';
      else historicalPattern = 'generally normal';
  }

  return {
    latest: {
      value: latest.value,
      unit: latest.unit,
      date: latest.effective_date
    },
    previousValuesCount,
    abnormalValuesCount,
    abnormalRecentCount,
    trendDirection,
    historicalPattern,
    confidence: previousValuesCount > 2 ? 'high' : 'low'
  };
}

export function getClinicalSummary(patientId: string): ClinicalSummary {
  const patientRow = db.prepare('SELECT * FROM patients WHERE id = ?').get(patientId) as any;
  if (!patientRow) throw new Error("Patient not found");

  const age = calcAge(patientRow.birth_date);
  const gender = patientRow.gender;

  const demographics = {
    id: patientRow.id,
    firstName: patientRow.first_name,
    lastName: patientRow.last_name,
    age,
    gender,
  };

  const rawObs = db.prepare('SELECT * FROM observations WHERE patient_id = ?').all(patientId) as any[];
  
  const normalizedObs = rawObs.map(o => ({
      ...o,
      normalizedKey: normalizeObservationKey(o.code, o.display)
  })).filter(o => o.normalizedKey !== null && o.value !== null);

  const metrics: ClinicalMetricKey[] = [
    'systolic_bp', 'diastolic_bp', 'heart_rate', 'bmi', 'weight', 'height',
    'ldl', 'hdl', 'triglycerides', 'glucose', 'hba1c', 'total_cholesterol'
  ];

  const trends: Record<string, any> = {};
  const latestVitals: Record<string, any> = {};
  const latestLabs: Record<string, any> = {};

  metrics.forEach(m => {
      const trend = processTrends(normalizedObs, m);
      if (trend) {
          trends[m] = trend;
          if (['systolic_bp', 'diastolic_bp', 'heart_rate', 'bmi', 'weight', 'height'].includes(m)) {
              latestVitals[m] = trend.latest;
          } else {
              latestLabs[m] = trend.latest;
          }
      }
  });

  const activeConditions = db.prepare("SELECT display, onset_date FROM conditions WHERE patient_id = ? AND status = 'active' ORDER BY onset_date DESC").all(patientId) as any[];
  const currentMedications = db.prepare("SELECT display, dosage, frequency FROM medications WHERE patient_id = ? AND status = 'active' ORDER BY start_date DESC").all(patientId) as any[];
  const allergies = db.prepare("SELECT substance FROM allergies WHERE patient_id = ? AND status = 'active'").all(patientId) as any[];
  const encounters = db.prepare("SELECT type, start_date, reason_display FROM encounters WHERE patient_id = ? ORDER BY start_date DESC LIMIT 5").all(patientId) as any[];

  // Risk Factors
  const cvRiskFactors: string[] = [];
  const metabolicRiskFactors: string[] = [];

  const hasCondition = (keywords: string[]) => activeConditions.some(c => keywords.some(kw => c.display.toLowerCase().includes(kw)));

  const hasDiabetes = hasCondition(['diabetes', 'prediabetes']);
  const hasHTN = hasCondition(['hypertension', 'high blood pressure']);

  // CV Risks
  if (age !== null && ((gender === 'male' && age > 45) || (gender === 'female' && age > 55))) cvRiskFactors.push('Age risk');
  if (latestVitals.systolic_bp?.value >= 130 || latestVitals.diastolic_bp?.value >= 80) cvRiskFactors.push('Elevated Blood Pressure');
  if (latestLabs.ldl?.value >= 130) cvRiskFactors.push('Elevated LDL');
  if (latestLabs.hdl && ((gender === 'male' && latestLabs.hdl.value < 40) || (gender === 'female' && latestLabs.hdl.value < 50))) cvRiskFactors.push('Low HDL');
  if (latestLabs.triglycerides?.value >= 150) cvRiskFactors.push('Elevated Triglycerides');
  if (latestVitals.bmi?.value >= 30) cvRiskFactors.push('Obesity (BMI >= 30)');
  if (hasDiabetes) cvRiskFactors.push('Diabetes/Prediabetes');

  // Metabolic Risks
  if (latestVitals.bmi?.value >= 25) metabolicRiskFactors.push('Overweight/Obesity (BMI >= 25)');
  if (latestLabs.glucose?.value >= 100) metabolicRiskFactors.push('Elevated Fasting Glucose');
  if (latestLabs.hba1c?.value >= 5.7) metabolicRiskFactors.push('Elevated HbA1c');
  if (latestLabs.triglycerides?.value >= 150) metabolicRiskFactors.push('Elevated Triglycerides');
  if (hasHTN) metabolicRiskFactors.push('Hypertension');
  if (hasDiabetes) metabolicRiskFactors.push('Diabetes/Prediabetes');

  // Missing Data
  const missingData: string[] = [];
  if (!latestLabs.ldl && !latestLabs.hdl) missingData.push('Lipid panel');
  if (!latestVitals.systolic_bp || trends.systolic_bp?.previousValuesCount === 0) missingData.push('Blood pressure trend');
  if (!latestLabs.hba1c) missingData.push('HbA1c');
  if (!latestLabs.glucose) missingData.push('Fasting glucose');
  if (!latestVitals.bmi) missingData.push('BMI');
  
  // Synthea rarely has these structured nicely, but we report them as missing per requirements
  missingData.push('Smoking status', 'Family history', 'Activity level', 'Diet');

  return {
    demographics,
    latestVitals,
    latestLabs,
    trends,
    activeConditions,
    currentMedications,
    allergies,
    encounters,
    cardiovascularRiskFactors: cvRiskFactors,
    metabolicRiskFactors,
    missingData,
    dataQualityNotes: ['Based solely on imported Synthea FHIR data.']
  };
}
