import { NextResponse } from 'next/server';
import { getSchedulerStatus, runAutoCheckCycle } from '@/lib/scheduler';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const shouldRun = searchParams.has('auto') || searchParams.has('cron') || searchParams.has('run');
    const force = searchParams.get('force') === 'true' || searchParams.get('force') === '1';

    let result = null;
    if (shouldRun) {
      result = await runAutoCheckCycle(force);
    }

    const status = await getSchedulerStatus();
    return NextResponse.json({ ok: true, result, scheduler: status });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    let force = false;
    try {
      const body = await request.json();
      if (body.force !== undefined) {
        force = Boolean(body.force);
      }
    } catch {
      // 检查 url 参数
      const { searchParams } = new URL(request.url);
      if (searchParams.get('force') === 'true' || searchParams.get('force') === '1') {
        force = true;
      }
    }

    const result = await runAutoCheckCycle(force);
    const updatedStatus = await getSchedulerStatus();
    return NextResponse.json({ ok: true, result, scheduler: updatedStatus });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

