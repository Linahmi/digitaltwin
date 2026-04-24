import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { Patient } from '@/types/patient'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { message, patientData } = await request.json()

    if (!message || !patientData) {
      return NextResponse.json(
        { error: 'Missing message or patient data' },
        { status: 400 }
      )
    }

    const patient: Patient = patientData

    // Build patient context for Claude
    const patientContext = buildPatientContext(patient)

    const systemPrompt = `You are a medical digital twin - an AI health assistant for ${patient.first_name} ${patient.last_name}.

Your role:
- Answer health questions using the patient's medical data
- Speak conversationally like Alexa - natural, warm, concise
- NEVER say "I don't know" - always provide evidence-based answers
- When discussing risks or recommendations, cite medical evidence
- Be encouraging and motivating
- Use simple language, avoid unnecessary jargon

Patient Context:
${patientContext}

CRITICAL RULES:
1. Only answer based on evidence - if uncertain, say "based on current medical evidence" and explain
2. Always justify recommendations with reasoning
3. Keep responses under 100 words unless asked for detail
4. Never diagnose - only discuss existing conditions and risk factors
5. For serious concerns, recommend consulting their doctor

Respond naturally as if speaking aloud.`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: message
      }]
    })

    const assistantMessage = response.content[0].type === 'text' 
      ? response.content[0].text 
      : ''

    return NextResponse.json({
      response: assistantMessage,
      usage: response.usage
    })

  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    )
  }
}

function buildPatientContext(patient: Patient): string {
  const age = patient.vitals.age
  const bmi = patient.vitals.bmi
  const bmiCategory = bmi < 18.5 ? 'underweight' : bmi < 25 ? 'normal' : bmi < 30 ? 'overweight' : 'obese'

  return `
Demographics:
- ${age} year old ${patient.vitals.sex}
- Height: ${patient.vitals.height_cm}cm, Weight: ${patient.vitals.weight_kg}kg
- BMI: ${bmi} (${bmiCategory})

Vital Signs:
- Blood Pressure: ${patient.vitals.systolic_bp}/${patient.vitals.diastolic_bp} mmHg
- Heart Rate: ${patient.vitals.heart_rate} bpm
- LDL Cholesterol: ${patient.vitals.ldl_cholesterol || 'N/A'} mg/dL
- HDL Cholesterol: ${patient.vitals.hdl_cholesterol || 'N/A'} mg/dL
- Triglycerides: ${patient.vitals.triglycerides || 'N/A'} mg/dL
- Fasting Glucose: ${patient.vitals.glucose_fasting || 'N/A'} mg/dL

Active Medical Conditions:
${patient.conditions.filter(c => c.status === 'active').map(c => `- ${c.name} (since ${c.onset_date})`).join('\n')}

Current Medications:
${patient.medications.map(m => `- ${m.name} ${m.dosage} ${m.frequency}`).join('\n')}

Allergies: ${patient.allergies.join(', ') || 'None'}
Smoking: ${patient.smoking_status}
Alcohol: ${patient.alcohol_use}
`.trim()
}
