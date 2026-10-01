import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

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

export function getConfig() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const envCreds = getEnvCredentials();

    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      return {
        ...DEFAULT_CONFIG,
        ...parsed,
        // 优先使用用户在 Web 界面保存的配置，若未填写则自动回退到 .env.local 环境变量
        DUO_JWT_TOKEN: parsed.DUO_JWT_TOKEN || envCreds.DUO_JWT_TOKEN,
        FEISHU: {
          ...DEFAULT_CONFIG.FEISHU,
          ...(parsed.FEISHU || {}),
          APP_ID: parsed.FEISHU?.APP_ID || envCreds.FEISHU.APP_ID,
          APP_SECRET: parsed.FEISHU?.APP_SECRET || envCreds.FEISHU.APP_SECRET,
          RECEIVE_PHONE_OR_EMAIL: parsed.FEISHU?.RECEIVE_PHONE_OR_EMAIL || envCreds.FEISHU.RECEIVE_PHONE_OR_EMAIL
        },
        schedule: {
          ...DEFAULT_CONFIG.schedule,
          ...(parsed.schedule || {})
        }
      };
    }
    const initialConfig = {
      ...DEFAULT_CONFIG,
      DUO_JWT_TOKEN: envCreds.DUO_JWT_TOKEN,
      FEISHU: {
        ...DEFAULT_CONFIG.FEISHU,
        ...envCreds.FEISHU
      }
    };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(initialConfig, null, 2), 'utf-8');
    return initialConfig;
  } catch (err) {
    console.error("Failed to read config:", err);
    return DEFAULT_CONFIG;
  }
}

export function saveConfig(newConfig) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const current = getConfig();

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

    fs.writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2), 'utf-8');
    return { ok: true, config: merged };
  } catch (err) {
    console.error("Failed to save config:", err);
    return { ok: false, error: err.message };
  }
}
