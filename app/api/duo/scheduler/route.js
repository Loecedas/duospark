import { NextResponse } from 'next/server';
import { getSchedulerStatus, runAutoCheckCycle } from '@/lib/scheduler';

export async function GET() {
  try {
    const status = await getSchedulerStatus();
    return NextResponse.json({ ok: true, scheduler: status });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    let force = true;
    try {
      const body = await request.json();
      if (body.force !== undefined) force = Boolean(body.force);
    } catch {}

    const result = await runAutoCheckCycle(force);
    const updatedStatus = await getSchedulerStatus();
    return NextResponse.json({ ok: true, result, scheduler: updatedStatus });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
