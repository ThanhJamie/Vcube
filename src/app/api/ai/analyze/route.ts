import { NextRequest, NextResponse } from 'next/server';
import { ModelAnalysisService } from '@/src/ai/services/modelAnalysisService';
import { MeshGeometryMetrics } from '@/src/ai/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const metrics: MeshGeometryMetrics = body.metrics;

    if (!metrics || !metrics.dimensionsMm) {
      return NextResponse.json(
        { error: 'Missing geometry metrics in request payload' },
        { status: 400 }
      );
    }

    const report = await ModelAnalysisService.analyzeMesh(metrics);
    return NextResponse.json({ success: true, report });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to analyze 3D mesh' },
      { status: 500 }
    );
  }
}
