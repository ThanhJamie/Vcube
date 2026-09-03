import { NextRequest, NextResponse } from 'next/server';
import { PricingService } from '@/src/backend/services/pricingService';

export async function POST(req: NextRequest) {
  try {
    const input = await req.json();
    if (!input || !input.file) {
      return NextResponse.json(
        { error: 'Missing pricing calculation input' },
        { status: 400 }
      );
    }

    const calculation = PricingService.calculateQuote(input);
    return NextResponse.json({ success: true, calculation });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Error processing quote calculation' },
      { status: 500 }
    );
  }
}
