import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
const KV_CONFIG_KEY = 'duo_config';

export const DEFAULT_CONFIG = {
  DUO_JWT_TOKEN: "",
  FEISHU: {
    APP_ID: "",
    APP_SECRET: "",
    RECEIVE_PHONE_OR_EMAIL: ""
  },
  schedule: {
    enabled: true,
    targetXp: 15, // 每次打卡目标经验 (XP)

    // 1. 每天定期巡检频率 (默认每 5 个小时检测一次)
    intervalHours: 5,
    lastIntervalCheckTime: 0,

    // 2. 平日（周一至周六）打卡防线
    // 晚上 23:00 检测，若未打卡，隔 10 分钟在 23:10 自动打卡
    normalCheckTime: "23:00",
    normalPunchTime: "23:10",

    // 3. 周日专属打卡防线
    // 下午 17:00 检测，若未打卡，隔 10 分钟在 17:10 自动打卡
    sundayCheckTime: "17:00",
    sundayPunchTime: "17:10",

    // 4. 通知配置
    notifyOnWarning: true, // 初次检测未打卡时是否推送 10 分钟预警通知
    notifyOnAlreadyChecked: true, // 巡检已打卡是否通知

    // 5. 状态与单日防重复标记
    lastPunchedDate: "", // 严格记录今日是否已打卡 (格式: YYYY-MM-DD)，单日绝不重复打卡
    lastWarningDate: "", // 记录今日是否已发送过预警
    lastCheckDate: "",
    lastCheckTime: "",
    lastCheckResult: "",
    lastCheckSuccess: false
  }
};

let inMemoryConfig = null;

async function getCloudflareDB() {
  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const ctx = getCloudflareContext();
    return ctx?.env?.DB || null;
  } catch {
    return null;
  }
}

function getEnvCredentials() {
  return {
    DUO_JWT_TOKEN: process.env.DUO_JWT_TOKEN || "",
    FEISHU: {
      APP_ID: process.env.FEISHU_APP_ID || "",
      APP_SECRET: process.env.FEISHU_APP_SECRET || "",
      RECEIVE_PHONE_OR_EMAIL: process.env.FEISHU_RECEIVE_PHONE_OR_EMAIL || ""
    }
  };
}

export async function getConfig() {
  const envCreds = getEnvCredentials();
  let loadedConfig = {};

  // 1. 尝试优先从 Cloudflare D1 数据库读取
  try {
    const db = await getCloudflareDB();
    if (db) {
      const row = await db.prepare("SELECT value FROM app_config WHERE key = ?").bind('main_config').first();
      if (row?.value) {
        try {
          loadedConfig = JSON.parse(row.value);
        } catch {}
      }
    }
  } catch (dbErr) {
    console.warn("[Config] D1 数据库读取跳过:", dbErr.message);
  }

  // 2. 若 D1 中暂无数据，尝试从本地文件系统读取
  if (Object.keys(loadedConfig).length === 0) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch {}
      }
      if (fs.existsSync(CONFIG_FILE)) {
        const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
        loadedConfig = JSON.parse(data);
      }
    } catch (err) {
      // 忽略边缘环境文件系统读取错误
    }
  }

  const base = inMemoryConfig || loadedConfig;
  const merged = {
    ...DEFAULT_CONFIG,
    ...base,
    // 优先使用用户在 Web 界面保存的配置，若未填写则自动回退到环境变量
    DUO_JWT_TOKEN: base.DUO_JWT_TOKEN || envCreds.DUO_JWT_TOKEN,
    FEISHU: {
      ...DEFAULT_CONFIG.FEISHU,
      ...(base.FEISHU || {}),
      APP_ID: base.FEISHU?.APP_ID || envCreds.FEISHU.APP_ID,
      APP_SECRET: base.FEISHU?.APP_SECRET || envCreds.FEISHU.APP_SECRET,
      RECEIVE_PHONE_OR_EMAIL: base.FEISHU?.RECEIVE_PHONE_OR_EMAIL || envCreds.FEISHU.RECEIVE_PHONE_OR_EMAIL
    },
    schedule: {
      ...DEFAULT_CONFIG.schedule,
      ...(base.schedule || {})
    }
  };

  inMemoryConfig = merged;
  return merged;
}

export function getSyncConfig() {
  const envCreds = getEnvCredentials();
  const base = inMemoryConfig || {};
  return {
    ...DEFAULT_CONFIG,
    ...base,
    DUO_JWT_TOKEN: base.DUO_JWT_TOKEN || envCreds.DUO_JWT_TOKEN,
    FEISHU: {
      ...DEFAULT_CONFIG.FEISHU,
      ...(base.FEISHU || {}),
      APP_ID: base.FEISHU?.APP_ID || envCreds.FEISHU.APP_ID,
      APP_SECRET: base.FEISHU?.APP_SECRET || envCreds.FEISHU.APP_SECRET,
      RECEIVE_PHONE_OR_EMAIL: base.FEISHU?.RECEIVE_PHONE_OR_EMAIL || envCreds.FEISHU.RECEIVE_PHONE_OR_EMAIL
    },
    schedule: {
      ...DEFAULT_CONFIG.schedule,
      ...(base.schedule || {})
    }
  };
}

export async function saveConfig(newConfig) {
  try {
    const current = await getConfig();

    // 保护敏感字段：若传入的是带掩码(...)或(****)的前端展示值，则保留原有真实秘钥，防止被覆盖
    let safeDuoJwt = current.DUO_JWT_TOKEN;
    if (newConfig.DUO_JWT_TOKEN !== undefined) {
      if (typeof newConfig.DUO_JWT_TOKEN === 'string' && newConfig.DUO_JWT_TOKEN.includes('...')) {
        safeDuoJwt = current.DUO_JWT_TOKEN;
      } else {
        safeDuoJwt = newConfig.DUO_JWT_TOKEN;
      }
    }

    let safeFeishuSecret = current.FEISHU?.APP_SECRET || "";
    if (newConfig.FEISHU?.APP_SECRET !== undefined) {
      if (typeof newConfig.FEISHU.APP_SECRET === 'string' && newConfig.FEISHU.APP_SECRET.includes('****')) {
        safeFeishuSecret = current.FEISHU?.APP_SECRET || "";
      } else {
        safeFeishuSecret = newConfig.FEISHU.APP_SECRET;
      }
    }

    const merged = {
      ...current,
      ...newConfig,
      DUO_JWT_TOKEN: safeDuoJwt,
      FEISHU: {
        ...current.FEISHU,
        ...(newConfig.FEISHU || {}),
        APP_SECRET: safeFeishuSecret
      },
      schedule: {
        ...current.schedule,
        ...(newConfig.schedule || {})
      }
    };

    // 清理废弃字段
    delete merged.PUSHPLUS_TOKEN;
    delete merged.autoPatrolEnabled;
    delete merged.autoPatrolIntervalMinutes;
    delete merged.autoRescueBeforeMidnightMinutes;

    inMemoryConfig = merged;

    // 1. 尝试持久化到 Cloudflare D1 数据库
    try {
      const db = await getCloudflareDB();
      if (db) {
        await db.prepare(`
          INSERT INTO app_config (key, value, updated_at) 
          VALUES ('main_config', ?, CURRENT_TIMESTAMP)
          ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
        `).bind(JSON.stringify(merged)).run();
      }
    } catch (dbErr) {
      console.warn("[Config] D1 保存跳过:", dbErr.message);
    }

    // 2. 尝试写入本地文件 (若环境支持)
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2), 'utf-8');
    } catch (writeErr) {
      // 边缘只读环境忽略写入异常
    }

    return { ok: true, config: merged };
  } catch (err) {
    console.error("Failed to save config:", err);
    return { ok: false, error: err.message };
  }
}
