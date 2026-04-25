import { NextResponse } from 'next/server'

export async function GET() {
  const data = {
    biomarkers: {
      cholesterol: {
        label: "LDL Cholesterol",
        unit: "mg/dL",
        zones: {
          optimal: [0, 100],
          borderline: [100, 160],
          elevated: [160, 300]
        },
        historical: [
          { date: "2022", value: 200 },
          { date: "2023", value: 180 },
          { date: "2024", value: 172 },
          { date: "2025", value: 165 }
        ],
        predicted: [
          { date: "2025", value: 165 },
          { date: "2026", value: 158 },
          { date: "2027", value: 154 },
          { date: "2028", value: 150 },
          { date: "2029", value: 147 },
          { date: "2030", value: 145 }
        ]
      },
      blood_pressure: {
        label: "Systolic Blood Pressure",
        unit: "mmHg",
        zones: {
          optimal: [0, 120],
          borderline: [120, 140],
          elevated: [140, 200]
        },
        historical: [
          { date: "2022", value: 155 },
          { date: "2023", value: 149 },
          { date: "2024", value: 146 },
          { date: "2025", value: 145 }
        ],
        predicted: [
          { date: "2025", value: 145 },
          { date: "2026", value: 144 },
          { date: "2027", value: 145 },
          { date: "2028", value: 146 },
          { date: "2029", value: 148 },
          { date: "2030", value: 148 }
        ]
      },
      weight: {
        label: "Body Weight",
        unit: "kg",
        zones: {
          optimal: [0, 75],
          borderline: [75, 90],
          elevated: [90, 150]
        },
        historical: [
          { date: "2022", value: 85 },
          { date: "2023", value: 88 },
          { date: "2024", value: 90 },
          { date: "2025", value: 92 }
        ],
        predicted: [
          { date: "2025", value: 92 },
          { date: "2026", value: 93 },
          { date: "2027", value: 95 },
          { date: "2028", value: 96 },
          { date: "2029", value: 97 },
          { date: "2030", value: 98 }
        ]
      }
    }
  }

  return NextResponse.json(data)
}
