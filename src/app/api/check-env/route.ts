
import { NextResponse } from 'next/server';

export async function GET() {
  const isAiEnabled = !!process.env.GEMINI_API_KEY || !!process.env.GOOGLE_API_KEY;
  return NextResponse.json({ isAiEnabled });
}

    