import { getConfig } from './config';

const encoder = new TextEncoder();

/**
 * 使用 PBKDF2 + SHA-256 + 16字节随机盐值对密码进行单向加密哈希
 * 生成格式: pbkdf2:100000:<saltHex>:<hashHex>
 */
export async function hashPassword(plainPassword) {
  if (!plainPassword) return "";
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(plainPassword),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );

  const hashHex = Array.from(new Uint8Array(derivedBits))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return `pbkdf2:100000:${saltHex}:${hashHex}`;
}

/**
 * 校验输入密码与存储的 PBKDF2 哈希（或兼容旧版明文）是否匹配
 */
export async function verifyPassword(plainPassword, storedHashOrPlain) {
  if (!plainPassword || !storedHashOrPlain) return false;

  if (storedHashOrPlain.startsWith('pbkdf2:')) {
    const parts = storedHashOrPlain.split(':');
    if (parts.length !== 4) return false;
    const iterations = parseInt(parts[1], 10);
    const saltHex = parts[2];
    const expectedHash = parts[3];

    const matches = saltHex.match(/.{1,2}/g);
    if (!matches) return false;
    const saltBytes = new Uint8Array(matches.map(byte => parseInt(byte, 16)));

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(plainPassword),
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );

    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: saltBytes,
        iterations: iterations,
        hash: 'SHA-256'
      },
      keyMaterial,
      256
    );

    const derivedHash = Array.from(new Uint8Array(derivedBits))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return derivedHash === expectedHash;
  }

  // 兼容直接配置在环境变量中的未哈希密码
  return plainPassword === storedHashOrPlain;
}

/**
 * 生成基于存储哈希的 HMAC-SHA256 会话 Token
 * 防止直接在 Cookie 中存放明文密码
 */
export async function getSessionToken(storedPasswordHash) {
  if (!storedPasswordHash) return "";
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(storedPasswordHash),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode('duospark_auth_session_v1'));
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * 验证当前请求是否有权限访问系统
 * 1. 若服务端未配置任何 ACCESS_PASSWORD，则直接放行
 * 2. 检查 Cookie (duo_auth) 或 Header (x-access-password / authorization)
 */
export async function verifyAuth(request) {
  const config = await getConfig();
  const storedPassword = config.ACCESS_PASSWORD?.trim();

  // 若未设置访问密码，视为无需密码保护，直接放行
  if (!storedPassword) {
    return { ok: true, requiresAuth: false, isAuthed: true };
  }

  const expectedSessionToken = await getSessionToken(storedPassword);

  // 1. 检查 Cookie: duo_auth
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const [k, ...v] = c.trim().split('=');
      return [k, decodeURIComponent(v.join('='))];
    })
  );

  if (cookies.duo_auth && (cookies.duo_auth === expectedSessionToken || cookies.duo_auth === storedPassword)) {
    return { ok: true, requiresAuth: true, isAuthed: true };
  }

  // 2. 检查 Header (x-access-password 或 Bearer token)
  const headerPassword = request.headers.get('x-access-password');
  const authHeader = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const candidate = headerPassword || authHeader;
  if (candidate) {
    if (candidate === expectedSessionToken) {
      return { ok: true, requiresAuth: true, isAuthed: true };
    }
    const isValid = await verifyPassword(candidate, storedPassword);
    if (isValid) {
      return { ok: true, requiresAuth: true, isAuthed: true };
    }
  }

  return { ok: false, requiresAuth: true, isAuthed: false, error: "未输入访问密码或密码错误" };
}
