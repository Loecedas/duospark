import { NextResponse } from 'next/server';
import { getHistory } from '@/lib/history';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const items = getHistory(limit);
  return NextResponse.json({ ok: true, history: items });
}
