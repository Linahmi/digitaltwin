/**
 * Primary demo patient: Chadwick Quigley, 66 M
 *
 * Selected from the Synthea dataset as the patient with the richest
 * cardiovascular profile among all male patients aged 45-70.
 * Composite CVD score: 52 (next best: 45). 222 observations over 10 years.
 *
 * Database ID: 3283eff1-fdfe-e209-d73a-8d332cdfb9c6
 */

export const CHADWICK_PATIENT_ID = "3283eff1-fdfe-e209-d73a-8d332cdfb9c6";

export const chadwickProfile = {
  id: "3283eff1-fdfe-e209-d73a-8d332cdfb9c6",

  demographics: {
    firstName: "Chadwick722",
    lastName: "Quigley282",
    displayName: "Chadwick Quigley",
    dateOfBirth: "1959-12-21",
    age: 66,
    gender: "male",
    maritalStatus: "Widowed",
  },

  selectionRationale: {
    compositeScore: 52,
    totalObservations: 222,
    observationYears: 10,
    dataSpan: { from: "2017-01-13", to: "2026-03-30" },
    totalEncounters: 92,
  },

  cardiovascularRiskFactors: [
    { name: "Essential hypertension",    onset: "2012-01-02", active: true },
    { name: "Type 2 Diabetes mellitus",  onset: "2015-01-19", active: true },
    { name: "Metabolic syndrome",        onset: "2015-01-19", active: true },
    { name: "Hypertriglyceridemia",      onset: "2016-01-25", active: true },
    { name: "Obesity / BMI 30+",         onset: "1997-03-10", active: true },
    { name: "Prediabetes",               onset: "1982-02-22", active: true },
    { name: "Ischemic heart disease",    onset: "2024-03-11", active: true },
    { name: "Abnormal cardiac/coronary imaging", onset: "2024-03-22", active: true },
  ],

  activeMedications: [
    { drug: "Simvastatin 20 mg",                   role: "statin — LDL control",         started: "2024-03-18" },
    { drug: "Clopidogrel 75 mg",                   role: "antiplatelet — post-IHD",       started: "2024-03-18" },
    { drug: "Metoprolol succinate 100 mg ER",      role: "beta-blocker — IHD / HTN",     started: "2024-03-18" },
    { drug: "Nitroglycerin 0.4 mg/actuat spray",   role: "angina rescue",                 started: "2024-03-18" },
    { drug: "Hydrochlorothiazide 25 mg",           role: "diuretic — hypertension",       started: "2016-01-25" },
    { drug: "Metformin 500 mg ER",                 role: "type 2 diabetes",               started: "2016-01-25" },
    { drug: "Ferrous sulfate 325 mg",              role: "anemia",                         started: "1982-03-01" },
  ],

  /**
   * Annual lab snapshots (one reading per year from routine visits).
   * All values drawn from the Synthea observations table.
   */
  labTimeline: [
    {
      date: "2017-01-13",
      systolicBP: 118,   diastolicBP: 101,
      ldl: 90.92,        hdl: 48.50,   totalCholesterol: 168.28,
      triglycerides: 144.33,
      hba1c: 5.38,       fastingGlucose: 91.52,
      bmi: 27.46,        weightKg: 86.7,
    },
    {
      date: "2018-02-05",
      systolicBP: 126,   diastolicBP: 103,
      ldl: 45.77,        hdl: 56.61,   totalCholesterol: 127.41,
      triglycerides: 125.13,
      hba1c: 5.48,       fastingGlucose: 71.51,
      bmi: 27.93,        weightKg: 88.2,
    },
    {
      date: "2019-02-11",
      systolicBP: 123,   diastolicBP: 104,
      ldl: 134.44,       hdl: 61.61,   totalCholesterol: 217.19,
      triglycerides: 105.72,
      hba1c: 5.67,       fastingGlucose: 90.71,
      bmi: 28.70,        weightKg: 90.6,
    },
    {
      date: "2020-02-17",
      systolicBP: 123,   diastolicBP: 97,
      ldl: 86.19,        hdl: 55.74,   totalCholesterol: 166.48,
      triglycerides: 122.74,
      hba1c: 5.86,       fastingGlucose: 91.89,
      bmi: 29.47,        weightKg: 93.0,
    },
    {
      date: "2021-02-22",
      systolicBP: 123,   diastolicBP: 104,
      ldl: 52.20,        hdl: 56.76,   totalCholesterol: 136.33,
      triglycerides: 136.85,
      hba1c: 6.06,       fastingGlucose: 86.29,
      bmi: 30.23,        weightKg: 95.5,
    },
    {
      date: "2022-02-28",
      systolicBP: 122,   diastolicBP: 104,
      ldl: 109.07,       hdl: 52.40,   totalCholesterol: 183.52,
      triglycerides: 110.25,
      hba1c: 5.35,       fastingGlucose: 94.15,
      bmi: 27.35,        weightKg: 86.4,
    },
    {
      date: "2023-03-06",
      systolicBP: 122,   diastolicBP: 104,
      ldl: 92.63,        hdl: 53.55,   totalCholesterol: 170.65,
      triglycerides: 122.31,
      hba1c: 5.50,       fastingGlucose: 98.64,
      bmi: 28.02,        weightKg: 88.5,
    },
    {
      date: "2024-03-11",
      // IHD diagnosed this visit → statin + clopidogrel + metoprolol + nitro added
      systolicBP: 115,   diastolicBP: 102,
      ldl: 120.50,       hdl: 65.53,   totalCholesterol: 207.37,
      triglycerides: 106.71,
      hba1c: 5.69,       fastingGlucose: 68.77,
      bmi: 28.77,        weightKg: 90.9,
    },
    {
      date: "2025-03-24",
      // First annual check after statin initiation
      systolicBP: 110,   diastolicBP: 89,
      ldl: 33.73,        hdl: 55.50,   totalCholesterol: 117.11,
      triglycerides: 139.39,
      hba1c: 5.88,       fastingGlucose: 65.47,
      bmi: 29.54,        weightKg: 93.3,
    },
    {
      date: "2026-03-30",
      systolicBP: 106,   diastolicBP: 86,
      ldl: 62.08,        hdl: 53.51,   totalCholesterol: 143.82,
      triglycerides: 141.13,
      hba1c: 6.05,       fastingGlucose: 96.46,
      bmi: 30.14,        weightKg: 95.2,
    },
  ],

  clinicalNarrative: `
Chadwick is a 66-year-old widowed man who spent over three decades accumulating
unchecked cardiovascular risk before an ischemic heart disease diagnosis in March
2024 triggered full secondary-prevention treatment.

Risk progression:
  • 1982: Prediabetes detected at age 22 — never fully resolved
  • 1997: Obesity onset (BMI 30+, age 37)
  • 2012: Essential hypertension diagnosed at 52 — started HCTZ 2016
  • 2015: Type 2 Diabetes + Metabolic syndrome confirmed — started Metformin
  • 2016: Hyperglycemia and hypertriglyceridemia added to the picture
  • 2020: Hospitalised for COVID-19 pneumonia (12-day admission, Nov-Dec 2020)
  • 2024: Ischemic heart disease + abnormal cardiac/coronary imaging →
          Clopidogrel, Simvastatin, Metoprolol, Nitroglycerin initiated

Treatment response (post-IHD):
  • LDL dropped from 120.5 mg/dL (pre-statin, 2024) to 33.7 mg/dL (2025),
    settling at 62.1 mg/dL in 2026 — statin clearly effective
  • BP improving: systolic 106 mmHg, diastolic 86 mmHg (was 118-129/97-106 for years)
  • HbA1c creeping upward (5.38% in 2017 → 6.05% in 2026) despite Metformin —
    glycaemic control slipping, approaching the 6.5% diagnostic threshold
  • BMI borderline obese at 30.1 kg/m², weight 95.2 kg
  • Triglycerides persistently elevated (~141 mg/dL), partially driven by DM2

Psychosocial context:
  Social isolation, limited education, substance use history, multiple overdose
  episodes (2016-2021), intimate partner abuse — factors that complicate
  long-term medication adherence and risk management.
  `.trim(),

  heightCm: 177.7,
} as const;

export type ChadwickLabEntry = (typeof chadwickProfile.labTimeline)[number];
