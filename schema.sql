-- ========================================================
-- 🦉 DuoGuardian · Cloudflare D1 数据库初始化结构
-- 数据库: duospark (df994474-8ed4-462c-b5a3-392c0e721573)
-- ========================================================

-- 1. 系统与用户配置表 (存储打卡时间防线、Token凭证、飞书配置等)
CREATE TABLE IF NOT EXISTS app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. 打卡与巡检历史记录表 (存储每次检测、自动补卡、预警战报等)
CREATE TABLE IF NOT EXISTS punch_history (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  display_time TEXT,
  type TEXT,
  title TEXT,
  status TEXT,
  streak INTEGER DEFAULT 0,
  xp INTEGER DEFAULT 0,
  gained_xp INTEGER DEFAULT 0,
  details TEXT,
  feishu_sent INTEGER DEFAULT 0,
  raw_json TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. 创建索引以优化当天历史查询速度
CREATE INDEX IF NOT EXISTS idx_punch_history_date ON punch_history(date);
CREATE INDEX IF NOT EXISTS idx_punch_history_timestamp ON punch_history(timestamp DESC);
