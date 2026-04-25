import { NextResponse } from 'next/server';
import { simulateCVDRisk, SimulationScenario } from '@/lib/risk/simulation';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { patientId, scenario } = body;

    if (!patientId) {
      return NextResponse.json({ error: 'patientId is required' }, { status: 400 });
    }

    if (!scenario || typeof scenario !== 'object') {
      return NextResponse.json({ error: 'Valid scenario object is required' }, { status: 400 });
    }

    try {
      const result = simulateCVDRisk(patientId, scenario as SimulationScenario);
      
      // If we couldn't calculate risk due to missing vital data
      if (result.currentRisk === null && result.missingData.length > 0) {
        return NextResponse.json({
          error: 'Cannot calculate risk due to missing critical data.',
          missingData: result.missingData,
          assumptions: result.assumptions
        }, { status: 422 });
      }

      return NextResponse.json(result);
    } catch (e: any) {
      if (e.message && e.message.includes('Patient not found')) {
        return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
      }
      throw e; // Let the outer catch handle 500s
    }

  } catch (error: any) {
    console.error('Simulation API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
