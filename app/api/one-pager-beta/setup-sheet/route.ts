import { NextResponse } from 'next/server';
import { setupSheet } from '@/lib/google-sheets';

export async function POST() {
  try {
    await setupSheet();
    return NextResponse.json({ success: true, message: 'Sheet configured: tab renamed + header row set' });
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
