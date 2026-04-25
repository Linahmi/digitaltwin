/**
 * lib/db/clinicalMappings.ts
 *
 * Maps FHIR observation codes and display strings to normalized clinical keys.
 * This ensures robust matching despite naming variations in the FHIR data.
 */

export type ClinicalMetricKey = 
  | 'systolic_bp'
  | 'diastolic_bp'
  | 'heart_rate'
  | 'bmi'
  | 'weight'
  | 'height'
  | 'ldl'
  | 'hdl'
  | 'triglycerides'
  | 'glucose'
  | 'hba1c'
  | 'total_cholesterol'

interface MetricMapping {
  key: ClinicalMetricKey;
  codes: string[];
  keywords: string[];
}

const mappings: MetricMapping[] = [
  {
    key: 'systolic_bp',
    codes: ['8480-6'],
    keywords: ['systolic', 'systolic blood pressure']
  },
  {
    key: 'diastolic_bp',
    codes: ['8462-4'],
    keywords: ['diastolic', 'diastolic blood pressure']
  },
  {
    key: 'heart_rate',
    codes: ['8867-4'],
    keywords: ['heart rate', 'pulse']
  },
  {
    key: 'bmi',
    codes: ['39156-5'],
    keywords: ['bmi', 'body mass index']
  },
  {
    key: 'weight',
    codes: ['29463-7'],
    keywords: ['weight', 'body weight']
  },
  {
    key: 'height',
    codes: ['8302-2'],
    keywords: ['height', 'body height']
  },
  {
    key: 'ldl',
    codes: ['18262-6'],
    keywords: ['ldl', 'ldl cholesterol', 'low density lipoprotein']
  },
  {
    key: 'hdl',
    codes: ['2085-9'],
    keywords: ['hdl', 'hdl cholesterol', 'high density lipoprotein']
  },
  {
    key: 'triglycerides',
    codes: ['2571-8'],
    keywords: ['triglyceride', 'triglycerides']
  },
  {
    key: 'glucose',
    codes: ['2339-0'],
    keywords: ['glucose', 'fasting glucose', 'blood glucose']
  },
  {
    key: 'hba1c',
    codes: ['4548-4'],
    keywords: ['hba1c', 'hemoglobin a1c', 'a1c']
  },
  {
    key: 'total_cholesterol',
    codes: ['2093-3'],
    keywords: ['total cholesterol', 'cholesterol']
  }
]

export function normalizeObservationKey(code: string, display: string): ClinicalMetricKey | null {
  const lowerDisplay = display.toLowerCase();
  
  for (const mapping of mappings) {
    if (mapping.codes.includes(code)) return mapping.key;
    if (mapping.keywords.some(kw => lowerDisplay.includes(kw))) return mapping.key;
  }
  
  return null;
}
