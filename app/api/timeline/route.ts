import { NextResponse } from 'next/server'

export async function GET() {
  // Static mock timeline data according to user request
  const mockData = {
    historical: [
      { date: "2022", cholesterol: 200, systolic: 155, diastolic: 95, weight: 85 },
      { date: "2023", cholesterol: 185, systolic: 150, diastolic: 94, weight: 88 },
      { date: "2024", cholesterol: 175, systolic: 148, diastolic: 93, weight: 90 },
      { date: "2025", cholesterol: 165, systolic: 145, diastolic: 92, weight: 92 },
    ],
    predicted: [
      { date: "2025", cholesterol: 165, systolic: 145, diastolic: 92, weight: 92 }, // Overlap point
      { date: "2026", cholesterol: 160, systolic: 144, diastolic: 91, weight: 94 },
      { date: "2027", cholesterol: 158, systolic: 146, diastolic: 91, weight: 95 },
      { date: "2028", cholesterol: 155, systolic: 147, diastolic: 92, weight: 97 },
      { date: "2029", cholesterol: 152, systolic: 148, diastolic: 93, weight: 99 },
    ]
  }

  return NextResponse.json(mockData)
}
