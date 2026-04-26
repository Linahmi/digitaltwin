import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { readFileSync } from 'fs'
import { join } from 'path'

// Tried in order — first one that responds with an image wins.
const MODELS = [
  'gemini-2.5-flash-image',
  'gemini-2.5-flash-preview-image-generation',
  'gemini-2.0-flash-exp',
  'gemini-3-pro-image-preview',
]

function isNotFoundError(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  return (
    err.message.includes('NOT_FOUND') ||
    err.message.includes('"code":404') ||
    err.message.includes('not found')
  )
}

function buildPrompt(
  scenario: string,
  patient: {
    age: number | null
    sex: string | null
    bmi: number | null
    weight: number | null
    biomarkers: string
  }
): string {
  return `Edit ONLY the anatomical body in the provided image.

This image is a clinical digital twin anatomical visualization.

You MUST preserve exactly:
- the same front-facing standing pose
- the same anatomical illustration style (medical, not photorealistic)
- the same proportions and body structure
- the same camera angle and framing
- the same lighting and shading
- the same soft white/blue background
- the same circular scan rings
- the same marker positions on the body
- the same blending into the background

DO NOT change:
- layout
- UI elements
- background structure
- color palette
- image size or crop
- body pose
- perspective
- style

ONLY apply subtle, medically plausible changes based on this scenario:

Scenario: ${scenario}

Patient context:
- age: ${patient.age ?? 'unknown'}
- sex: ${patient.sex ?? 'unknown'}
- BMI: ${patient.bmi != null ? patient.bmi.toFixed(1) : 'unknown'}
- weight: ${patient.weight != null ? `${patient.weight.toFixed(1)} kg` : 'unknown'}
- biomarkers: ${patient.biomarkers}

---

SCENARIO RULES:

If scenario = "lose_weight" OR "lower_weight_load":
- subtly reduce visible adipose tissue
- reduce abdominal fat slightly
- slightly reduce fat around chest, waist, thighs
- keep body realistic (NOT thin, NOT athletic)
- do NOT increase muscle definition artificially

If scenario = "exercise":
- slightly improve muscle tone
- slightly improve posture
- keep anatomical style (NOT gym body)
- very subtle changes only

If scenario = "improve_diet" OR "optimize_lipids":
- keep body shape mostly unchanged
- reduce metabolic emphasis in abdominal region
- subtle internal/vascular improvement cues only

---

STRICT RULES:

- This is NOT a fitness or beauty transformation.
- No exaggerated muscles.
- No unrealistic thinness.
- No stylization changes.
- No photorealistic skin.
- No clothing.
- No additional elements.
- No text.
- No UI overlays.
- No identity change.

The output must look like the SAME image, but with small clinically meaningful body changes.

Return ONLY the edited image.`
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { scenario, patient } = body as {
      scenario: string
      patient: {
        age: number | null
        sex: string | null
        bmi: number | null
        weight: number | null
        biomarkers: string
      }
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not configured' }, { status: 500 })
    }

    const imagePath = join(process.cwd(), 'public', 'anatomy-muscular-hero-v2.png')
    const imageBuffer = readFileSync(imagePath)
    const base64Image = imageBuffer.toString('base64')

    const ai = new GoogleGenAI({ apiKey })

    const contents = [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType: 'image/png', data: base64Image } },
          { text: buildPrompt(scenario, patient) },
        ],
      },
    ]

    let lastError = 'No image generation model is currently available'

    for (const model of MODELS) {
      try {
        console.log(`[body-simulation] trying model: ${model}`)

        const response = await ai.models.generateContent({
          model,
          contents,
          config: { responseModalities: ['TEXT', 'IMAGE'] },
        })

        const candidate = response.candidates?.[0]
        if (!candidate?.content?.parts) {
          lastError = 'No response parts from model'
          continue
        }

        const imagePart = candidate.content.parts.find(
          (p: { inlineData?: { data?: string; mimeType?: string } }) => p.inlineData?.data
        )

        if (!imagePart?.inlineData?.data) {
          lastError = `Model ${model} returned no image`
          continue
        }

        console.log(`[body-simulation] success with model: ${model}`)
        return NextResponse.json({ image: imagePart.inlineData.data })
      } catch (err) {
        if (isNotFoundError(err)) {
          console.log(`[body-simulation] model not found: ${model}, trying next`)
          lastError = `Model ${model} not available`
          continue
        }
        // Non-404 error — rethrow to outer catch
        throw err
      }
    }

    return NextResponse.json({ error: lastError }, { status: 503 })
  } catch (err) {
    console.error('[body-simulation]', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
