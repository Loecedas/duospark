import { NextResponse } from 'next/server';
import { getConfig, saveConfig } from '@/lib/config';
import { getSchedulerStatus } from '@/lib/scheduler';

function sanitizeConfigForClient(cfg) {
  const maskedJwt = cfg.DUO_JWT_TOKEN 
    ? `${cfg.DUO_JWT_TOKEN.substring(0, 16)}...${cfg.DUO_JWT_TOKEN.slice(-10)}` 
    : '';
  const maskedSecret = cfg.FEISHU?.APP_SECRET 
    ? `${cfg.FEISHU.APP_SECRET.substring(0, 4)}****${cfg.FEISHU.APP_SECRET.slice(-4)}` 
    : '';

  // 绝不向前端返回真实未掩码的 JWT Token 和 Feishu Secret
  const safeConfig = {
    ...cfg,
    DUO_JWT_TOKEN: maskedJwt,
    FEISHU: {
      ...cfg.FEISHU,
      APP_SECRET: maskedSecret
    }
  };

  return {
    safeConfig,
    masked: {
      DUO_JWT_TOKEN: maskedJwt,
      FEISHU_APP_SECRET: maskedSecret,
      hasJwt: Boolean(cfg.DUO_JWT_TOKEN),
      hasSecret: Boolean(cfg.FEISHU?.APP_SECRET)
    }
  };
}

export async function GET() {
  const rawConfig = getConfig();
  const scheduler = getSchedulerStatus();
  const { safeConfig, masked } = sanitizeConfigForClient(rawConfig);

  return NextResponse.json({
    ok: true,
    config: safeConfig,
    scheduler,
    masked
  });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const result = saveConfig(body);
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
    }
    const scheduler = getSchedulerStatus();
    const { safeConfig, masked } = sanitizeConfigForClient(result.config);

    return NextResponse.json({
      ok: true,
      config: safeConfig,
      scheduler,
      masked
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 400 });
  }
}
