import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');

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
 * 获取仅限当天的打卡与巡检动态 (过了当天自动过滤不可见)
 */
export function getTodayHistory(limit = 100) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const todayStr = getTodayDateStr();
    if (fs.existsSync(HISTORY_FILE)) {
      const data = fs.readFileSync(HISTORY_FILE, 'utf-8');
      const list = JSON.parse(data);
      if (!Array.isArray(list)) return [];
      
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
    return [];
  } catch (err) {
    console.error("Failed to read history:", err);
    return [];
  }
}

export function getHistory(limit = 100) {
  return getTodayHistory(limit);
}

export function addHistoryEntry(entry) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const todayStr = getTodayDateStr();
    const current = getTodayHistory(200);
    const item = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
      date: todayStr, // 标记为当天日期
      timestamp: new Date().toISOString(),
      displayTime: new Date().toLocaleTimeString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false }),
      ...entry
    };
    current.unshift(item);

    // 仅保存当天的最新 100 条记录，杜绝过往历史堆积
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(current.slice(0, 100), null, 2), 'utf-8');
    return item;
  } catch (err) {
    console.error("Failed to add history:", err);
    return null;
  }
}
