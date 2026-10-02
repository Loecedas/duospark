import { NextResponse } from 'next/server';
import { getConfig, saveConfig } from '@/lib/config';
import { getSchedulerStatus } from '@/lib/scheduler';

function sanitizeConfigForClient(cfg) {
  const maskedPassword = cfg.ACCESS_PASSWORD ? '********' : '';
  const maskedJwt = cfg.DUO_JWT_TOKEN 
    ? `${cfg.DUO_JWT_TOKEN.substring(0, 16)}...${cfg.DUO_JWT_TOKEN.slice(-10)}` 
    : '';
  const maskedSecret = cfg.FEISHU?.APP_SECRET 
    ? `${cfg.FEISHU.APP_SECRET.substring(0, 4)}****${cfg.FEISHU.APP_SECRET.slice(-4)}` 
    : '';

  // 绝不向前端返回真实未掩码的访问密码、JWT Token 和 Feishu Secret
  const safeConfig = {
    ...cfg,
    ACCESS_PASSWORD: maskedPassword,
    DUO_JWT_TOKEN: maskedJwt,
    FEISHU: {
      ...cfg.FEISHU,
      APP_SECRET: maskedSecret
    }
  };

  return {
    safeConfig,
    masked: {
      ACCESS_PASSWORD: maskedPassword,
      hasPassword: Boolean(cfg.ACCESS_PASSWORD),
      DUO_JWT_TOKEN: maskedJwt,
      FEISHU_APP_SECRET: maskedSecret,
      hasJwt: Boolean(cfg.DUO_JWT_TOKEN),
      hasSecret: Boolean(cfg.FEISHU?.APP_SECRET)
    }
  };
}

export async function GET() {
  const rawConfig = await getConfig();
  const scheduler = await getSchedulerStatus();
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
    const result = await saveConfig(body);
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
    }
    const scheduler = await getSchedulerStatus();
    const { safeConfig, masked } = sanitizeConfigForClient(result.config);

    const response = NextResponse.json({
      ok: true,
      config: safeConfig,
      scheduler,
      masked
    });

    // 若修改了访问密码，同步更新当前操作者的 Session Cookie 凭据，防止设置后立即被锁在门外
    if (body.ACCESS_PASSWORD !== undefined) {
      const newHash = result.config.ACCESS_PASSWORD?.trim();
      if (newHash) {
        const { getSessionToken } = await import('@/lib/auth');
        const sessionToken = await getSessionToken(newHash);
        response.cookies.set({
          name: 'duo_auth',
          value: sessionToken,
          path: '/',
          httpOnly: false,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 30 * 24 * 60 * 60
        });
      } else {
        response.cookies.delete('duo_auth');
      }
    }

    return response;
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 400 });
  }
}
