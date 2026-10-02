import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');

let inMemoryHistory = [];

async function getCloudflareDB() {
  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const ctx = getCloudflareContext();
    return ctx?.env?.DB || null;
  } catch {
    return null;
  }
}

export function getTodayDateStr(timeZone = 'Asia/Shanghai') {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return formatter.format(new Date()); // Returns YYYY-MM-DD
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

/**
 * 异步获取仅限当天的打卡与巡检动态 (支持 Cloudflare D1 数据库)
 */
export async function getTodayHistory(limit = 100) {
  const todayStr = getTodayDateStr();
  let list = inMemoryHistory;

  // 1. 优先尝试从 Cloudflare D1 数据库读取
  try {
    const db = await getCloudflareDB();
    if (db) {
      const { results } = await db.prepare(
        "SELECT * FROM punch_history WHERE date = ? ORDER BY timestamp DESC LIMIT ?"
      ).bind(todayStr, limit).all();

      if (Array.isArray(results) && results.length > 0) {
        list = results.map(row => {
          if (row.raw_json) {
            try { return JSON.parse(row.raw_json); } catch {}
          }
          return {
            id: row.id,
            date: row.date,
            timestamp: row.timestamp,
            displayTime: row.display_time,
            type: row.type,
            title: row.title,
            status: row.status,
            streak: row.streak,
            xp: row.xp,
            gainedXp: row.gained_xp,
            details: row.details,
            feishuSent: Boolean(row.feishu_sent)
          };
        });
      }
    }
  } catch (dbErr) {
    console.warn("[History] D1 读取跳过:", dbErr.message);
  }

  // 2. 本地文件备用
  if (list.length === 0) {
    try {
      if (fs.existsSync(HISTORY_FILE)) {
        const data = fs.readFileSync(HISTORY_FILE, 'utf-8');
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          list = parsed;
        }
      }
    } catch (err) {}
  }

  inMemoryHistory = list;

  // 严格仅保留当天的记录
  const todayList = list.filter((item) => {
    if (item.date) return item.date === todayStr;
    if (item.timestamp) {
      const itemDate = new Date(item.timestamp).toLocaleDateString('en-CA', { timeZone: 'Asia/Shanghai' });
      return itemDate === todayStr;
    }
    return false;
  });

  return todayList.slice(0, limit);
}

export async function getHistory(limit = 100) {
  return await getTodayHistory(limit);
}

export async function addHistoryEntry(entry) {
  try {
    const todayStr = getTodayDateStr();
    const item = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
      date: todayStr, // 标记为当天日期
      timestamp: new Date().toISOString(),
      displayTime: new Date().toLocaleTimeString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false }),
      ...entry
    };

    inMemoryHistory.unshift(item);
    inMemoryHistory = inMemoryHistory.slice(0, 100);

    // 1. 尝试保存至 Cloudflare D1 数据库
    try {
      const db = await getCloudflareDB();
      if (db) {
        await db.prepare(`
          INSERT INTO punch_history 
          (id, date, timestamp, display_time, type, title, status, streak, xp, gained_xp, details, feishu_sent, raw_json)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          item.id,
          item.date,
          item.timestamp,
          item.displayTime || '',
          item.type || '',
          item.title || '',
          item.status || '',
          item.streak || 0,
          item.xp || 0,
          item.gainedXp || 0,
          item.details || '',
          item.feishuSent ? 1 : 0,
          JSON.stringify(item)
        ).run();
      }
    } catch (dbErr) {
      console.warn("[History] D1 插入跳过:", dbErr.message);
    }

    // 2. 尝试写入本地文件 (若环境支持写入)
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(HISTORY_FILE, JSON.stringify(inMemoryHistory, null, 2), 'utf-8');
    } catch (writeErr) {
      // 边缘只读环境忽略写入异常
    }

    return item;
  } catch (err) {
    console.error("Failed to add history:", err);
    return null;
  }
}
