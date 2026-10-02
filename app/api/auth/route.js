import { NextResponse } from 'next/server';
import { getConfig } from '@/lib/config';
import { verifyAuth, verifyPassword, getSessionToken } from '@/lib/auth';

export async function GET(request) {
  try {
    const auth = await verifyAuth(request);
    return NextResponse.json({
      ok: true,
      requiresAuth: auth.requiresAuth,
      isAuthed: auth.isAuthed
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const config = await getConfig();
    const storedPassword = config.ACCESS_PASSWORD?.trim();

    // 如果未配置访问密码，直接视为通过
    if (!storedPassword) {
      return NextResponse.json({
        ok: true,
        requiresAuth: false,
        message: "当前系统未开启访问密码"
      });
    }

    let inputPassword = "";
    try {
      const body = await request.json();
      inputPassword = (body.password || "").trim();
    } catch {}

    if (!inputPassword) {
      return NextResponse.json({
        ok: false,
        error: "请输入访问密码"
      }, { status: 400 });
    }

    const isValid = await verifyPassword(inputPassword, storedPassword);
    if (!isValid) {
      return NextResponse.json({
        ok: false,
        error: "密码错误，请重新输入"
      }, { status: 401 });
    }

    // 验证成功，基于加密哈希派生安全的 Session Token 并写入 Cookie (30 天有效)
    const sessionToken = await getSessionToken(storedPassword);
    const response = NextResponse.json({
      ok: true,
      requiresAuth: true,
      isAuthed: true,
      message: "验证通过"
    });

    response.cookies.set({
      name: 'duo_auth',
      value: sessionToken,
      path: '/',
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 // 30 天
    });

    return response;
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true, message: "已锁定控制台" });
  response.cookies.delete('duo_auth');
  return response;
}
