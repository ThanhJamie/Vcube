import { NextRequest, NextResponse } from 'next/server';
import { CadAssistantService } from '@/src/ai/services/cadAssistantService';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, history } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Invalid or missing message string' },
        { status: 400 }
      );
    }

    const reply = await CadAssistantService.sendChatMessage(message, history || []);
    return NextResponse.json({ success: true, message: reply });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Error executing AI CAD assistant request' },
      { status: 500 }
    );
  }
}
