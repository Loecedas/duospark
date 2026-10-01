import { getConfig, saveConfig } from './config';
import { checkUserStatus, executeLessonPunch, getTodayDateString } from './duolingo';
import { notifyFeishuCard } from './feishu';
import { addHistoryEntry } from './history';

let isRunningCycle = false;
let lastErrorAlertTimestamp = 0;

function timeToMinutes(tStr) {
  if (!tStr) return 0;
  const [h, m] = tStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function getShanghaiTimeInfo() {
  const now = new Date();
  const dateInShanghai = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Shanghai" }));
  const dayKey = dateInShanghai.getDay(); // 0 is Sunday, 1-6 Mon-Sat
  const isSunday = dayKey === 0;

  const timeFormatter = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit'
  });
  const timeStr = timeFormatter.format(now);
  const currentMins = timeToMinutes(timeStr);
  const todayDate = getTodayDateString('Asia/Shanghai');

  return {
    dayKey,
    dayName: isSunday ? '周日' : `周${['日','一','二','三','四','五','六'][dayKey]}`,
    isSunday,
    timeStr,
    currentMins,
    todayDate,
    timestamp: now.getTime()
  };
}

export function computeNextScheduleDesc(schedule) {
  if (schedule?.enabled === false) {
    return "自动守护已暂停";
  }
  const { isSunday, dayName, todayDate } = getShanghaiTimeInfo();
  
  // 今日已打卡状态下，明确提示休眠，不再打卡也不再检测
  if (schedule?.lastPunchedDate === todayDate) {
    return "今日连胜已锁定保住！守护已进入安全休眠状态（今日不再检测、不再打卡，明日自动唤醒）";
  }

  const interval = schedule?.intervalHours || 5;
  if (isSunday) {
    const cTime = schedule?.sundayCheckTime || '17:00';
    const pTime = schedule?.sundayPunchTime || '17:10';
    return `每 ${interval}h 检测 | 周日 ${cTime} 预警检测，${pTime} 若未打卡自动打卡`;
  } else {
    const cTime = schedule?.normalCheckTime || '23:00';
    const pTime = schedule?.normalPunchTime || '23:10';
    return `每 ${interval}h 检测 | ${dayName} ${cTime} 预警检测，${pTime} 若未打卡自动打卡`;
  }
}

export function getSchedulerStatus() {
  const config = getConfig();
  const schedule = config.schedule || {};
  const timeInfo = getShanghaiTimeInfo();

  return {
    enabled: schedule.enabled !== false,
    targetXp: schedule.targetXp || 15,
    intervalHours: schedule.intervalHours || 5,
    normalCheckTime: schedule.normalCheckTime || '23:00',
    normalPunchTime: schedule.normalPunchTime || '23:10',
    sundayCheckTime: schedule.sundayCheckTime || '17:00',
    sundayPunchTime: schedule.sundayPunchTime || '17:10',
    notifyOnWarning: schedule.notifyOnWarning !== false,
    notifyOnAlreadyChecked: schedule.notifyOnAlreadyChecked !== false,
    
    // Status tracking
    isSunday: timeInfo.isSunday,
    dayName: timeInfo.dayName,
    todayDate: timeInfo.todayDate,
    lastPunchedDate: schedule.lastPunchedDate || '',
    isPunchedToday: schedule.lastPunchedDate === timeInfo.todayDate,
    lastWarningDate: schedule.lastWarningDate || '',
    lastCheckTime: schedule.lastCheckTime || '',
    lastCheckResult: schedule.lastCheckResult || '',
    nextScheduleDesc: computeNextScheduleDesc(schedule),
    isRunning: isRunningCycle
  };
}

/**
 * 核心调度循环：严格执行 5 小时间隔检测、23:00/17:00 预警及 10 分钟后自动打卡防线
 */
export async function runAutoCheckCycle(force = false) {
  if (isRunningCycle) {
    return { ok: false, reason: "已有检测任务正在执行中" };
  }

  isRunningCycle = true;
  try {
    const config = getConfig();
    const schedule = config.schedule || {};

    if (!config.DUO_JWT_TOKEN) {
      return { ok: false, reason: "未配置 DUO_JWT_TOKEN" };
    }

    if (!force && schedule.enabled === false) {
      return { ok: true, skipped: true, reason: "自动打卡已暂停" };
    }

    const { isSunday, dayName, timeStr, currentMins, todayDate, timestamp } = getShanghaiTimeInfo();

    // 核心安全铁律：当检测到今日已经打过卡时，今日直接静默休眠！
    // 既不再向多邻国发送多余的巡检检测请求，更绝不触发任何二次自动打卡！
    const alreadyPunchedToday = schedule.lastPunchedDate === todayDate;
    if (!force && alreadyPunchedToday) {
      return { 
        ok: true, 
        skipped: true, 
        reason: `今日（${todayDate}）连胜已确认打卡保持，守护程序今日休眠中，无需再次检测或自动打卡。` 
      };
    }

    const intervalMs = (Number(schedule.intervalHours) || 5) * 60 * 60 * 1000;
    const lastIntervalTime = schedule.lastIntervalCheckTime || 0;

    // 确定今日打卡规则参数
    const checkTimeStr = isSunday ? (schedule.sundayCheckTime || '17:00') : (schedule.normalCheckTime || '23:00');
    const punchTimeStr = isSunday ? (schedule.sundayPunchTime || '17:10') : (schedule.normalPunchTime || '23:10');
    const checkMins = timeToMinutes(checkTimeStr);
    const punchMins = timeToMinutes(punchTimeStr);

    // 检查触发条件类型：
    // A: 自动补卡执行时间 (punchMins, 例如周日 17:10 / 平日 23:10)
    const isPunchTimeTrigger = currentMins >= punchMins;
    // B: 初次预警检测时间 (checkMins, 例如周日 17:00 / 平日 23:00)
    const isWarningCheckTrigger = currentMins >= checkMins && currentMins < punchMins;
    // C: 每隔 5 小时的周期巡检
    const isIntervalTrigger = (timestamp - lastIntervalTime) >= intervalMs;

    if (!force && !isPunchTimeTrigger && !isWarningCheckTrigger && !isIntervalTrigger) {
      return { ok: true, skipped: true, reason: `尚未到达检测时间点 (当前 ${timeStr})` };
    }

    console.log(`[Scheduler] 触发巡检 (当前: ${dayName} ${timeStr}, 触发原因: ${isPunchTimeTrigger ? '打卡时限到达' : (isWarningCheckTrigger ? '10分钟预警检测' : (isIntervalTrigger ? '5小时周期巡检' : '手动强制执行'))})`);

    const status = await checkUserStatus(config.DUO_JWT_TOKEN);

    // 1. 如果已检测到今日打过卡
    if (status.hasExtendedToday) {
      const desc = `今日已打卡，连胜安全 (${status.streak}天)`;
      saveConfig({
        schedule: {
          ...schedule,
          lastPunchedDate: todayDate, // 锁定今日打卡状态，严防重复打卡
          lastCheckDate: todayDate,
          lastCheckTime: timeStr,
          lastCheckSuccess: true,
          lastCheckResult: desc,
          lastIntervalCheckTime: isIntervalTrigger ? timestamp : schedule.lastIntervalCheckTime
        }
      });

      addHistoryEntry({
        type: "ROUTINE_CHECK",
        title: `检测：今日已打卡 (${dayName})`,
        status: "SUCCESS",
        streak: status.streak,
        xp: status.totalXp,
        details: desc
      });

      if (schedule.notifyOnAlreadyChecked && !alreadyPunchedToday) {
        await notifyFeishuCard({
          isSuccess: true,
          title: `多邻国打卡守护 · 今日连胜安全 (${dayName})`,
          lines: [
            `🟢 **今日已完成打卡，连胜已保持**`,
            `🔥 当前连胜：**${status.streak} 天**`,
            `⭐ 累计经验：**${status.totalXp} XP**`,
            `🕒 巡检时间：${timeStr} (${dayName})`,
            `🔒 **防重复打卡机制**：今日打卡已锁定，系统将不再重复打卡。`
          ]
        }, config.FEISHU);
      }

      return {
        ok: true,
        action: "already_checked",
        status
      };
    }

    // 2. 如果今日尚未打卡：
    // 场景 A: 到达自动补卡时间点 (例如周日 17:10，平日 23:10)，且尚未打过卡 -> 执行自动通关打卡！
    if (isPunchTimeTrigger || (force && !status.hasExtendedToday)) {
      if (alreadyPunchedToday && !force) {
        return { ok: true, skipped: true, reason: "今日已打卡，严禁重复打卡" };
      }

      const targetXp = Number(schedule.targetXp) || 15;
      console.log(`[Scheduler] 警报：到达 ${punchTimeStr} 仍未打卡，正在执行自动补卡 (目标: ${targetXp} XP)...`);

      const punchResult = await executeLessonPunch(config.DUO_JWT_TOKEN, {
        force: false,
        targetXp
      });

      const punchTimeStrFull = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
      const triggerRuleDesc = isSunday 
        ? `周日专属打卡防线 (17:00 预警后，17:10 自动打卡)` 
        : `晚间兜底打卡防线 (23:00 预警后，23:10 自动打卡)`;

      // 发送飞书战报
      const feishuRes = await notifyFeishuCard({
        isSuccess: true,
        title: `多邻国 · 自动打卡成功 (${dayName} ${punchTimeStr})`,
        lines: [
          `🎉 **已成功为您自动完成今日多邻国打卡！**`,
          `🔥 连胜天数：**${punchResult.newStreak} 天**`,
          `⚡ 本次斩获：**+${punchResult.gainedXp} XP** (${punchResult.lessonCount} 节课)`,
          `⭐ 累计经验：**${punchResult.newTotalXp} XP**`,
          `🕒 打卡时间：${punchTimeStrFull}`,
          `📌 触发规则：${triggerRuleDesc}`,
          `🔒 **单日一次机制**：今日打卡已完成，今日绝不再重复打卡。`
        ]
      }, config.FEISHU);

      const desc = `自动打卡成功 +${punchResult.gainedXp}XP，连胜保持在 ${punchResult.newStreak} 天`;

      saveConfig({
        schedule: {
          ...schedule,
          lastPunchedDate: todayDate, // 严格标记今日已打卡，杜绝重复打卡！
          lastCheckDate: todayDate,
          lastCheckTime: timeStr,
          lastCheckSuccess: true,
          lastCheckResult: desc
        }
      });

      addHistoryEntry({
        type: "AUTO_PUNCH",
        title: `自动打卡成功 (${dayName} ${punchTimeStr})`,
        status: "SUCCESS",
        streak: punchResult.newStreak,
        xp: punchResult.newTotalXp,
        gainedXp: punchResult.gainedXp,
        details: desc,
        feishuSent: feishuRes?.ok ?? false
      });

      return {
        ok: true,
        action: "punched",
        punchResult,
        feishuRes
      };
    }

    // 场景 B: 初次预警时间点 (例如周日 17:00，平日 23:00)，未打卡 -> 发送 10 分钟倒计时预警通知
    if (isWarningCheckTrigger && schedule.lastWarningDate !== todayDate) {
      console.log(`[Scheduler] 预警：当前时间 ${timeStr} (${dayName}) 尚未打卡，发送 10 分钟自动补卡预警`);
      
      saveConfig({
        schedule: {
          ...schedule,
          lastWarningDate: todayDate,
          lastCheckTime: timeStr,
          lastCheckResult: `未打卡预警已发送，将在 ${punchTimeStr} 自动补卡`
        }
      });

      if (schedule.notifyOnWarning !== false) {
        await notifyFeishuCard({
          isSuccess: false,
          title: `⚠️ 多邻国打卡预警 (${dayName} ${checkTimeStr})`,
          lines: [
            `⏰ **多邻国今日打卡预警提醒**`,
            `📌 检测到您今日尚未点亮多邻国连胜！`,
            `⏳ **倒计时守护**：系统将在 **10 分钟后（${punchTimeStr}）** 再次检测，若仍未打卡将**自动为您通关打卡**（目标 ${schedule.targetXp || 15} XP）。`,
            `💡 如果您想自行打卡，可在 10 分钟内完成；若未完成，系统将自动守护连胜！`
          ]
        }, config.FEISHU);
      }

      addHistoryEntry({
        type: "WARNING",
        title: `打卡预警推送 (${dayName} ${checkTimeStr})`,
        status: "WARNING",
        streak: status.streak,
        xp: status.totalXp,
        details: `检测到尚未打卡，已向飞书发送预警，将在 ${punchTimeStr} 自动打卡`
      });

      return { ok: true, action: "warning_sent", status };
    }

    // 场景 C: 每隔 5 小时的日常巡检 (若未打卡，记录状态更新)
    if (isIntervalTrigger) {
      saveConfig({
        schedule: {
          ...schedule,
          lastIntervalCheckTime: timestamp,
          lastCheckDate: todayDate,
          lastCheckTime: timeStr,
          lastCheckResult: `5小时间隔巡检：今日暂未打卡`
        }
      });

      addHistoryEntry({
        type: "INTERVAL_CHECK",
        title: `5小时巡检：今日待打卡 (${dayName})`,
        status: "INFO",
        streak: status.streak,
        xp: status.totalXp,
        details: `当前连胜 ${status.streak} 天，将在预警时间检测或补卡`
      });
    }

    return {
      ok: true,
      action: "checked",
      status
    };
  } catch (err) {
    console.error("[Scheduler] 巡检打卡异常:", err);
    addHistoryEntry({
      type: "ERROR",
      title: "巡检打卡异常",
      status: "ERROR",
      details: err.message
    });

    // 核心兜底告警：若巡检或打卡出现致命异常，立即向飞书发送醒目的红色求助卡片（限流 15 分钟一次，防刷屏）
    const nowTime = Date.now();
    if (nowTime - lastErrorAlertTimestamp > 15 * 60 * 1000) {
      lastErrorAlertTimestamp = nowTime;
      const config = getConfig();
      if (config.FEISHU?.APP_ID && config.FEISHU?.APP_SECRET) {
        notifyFeishuCard({
          isSuccess: false,
          title: "🚨 多邻国守护系统 · 打卡异常告警",
          lines: [
            `⚠️ **自动打卡/检测遇到异常，为保住连胜请留意！**`,
            `❌ **异常原因**：${err.message}`,
            `🕒 **告警时间**：${new Date().toLocaleTimeString('zh-CN', { timeZone: 'Asia/Shanghai' })}`,
            `💡 **常见原因**：多邻国 Token 过期、网络短暂抖动或官方接口临时维护。`,
            `📌 **应对策略**：调度器每 30 秒会自动持续重试；若 Token 失效，请尽快打开 App 手动完成一关保底！`
          ]
        }, config.FEISHU).catch(() => {});
      }
    }

    return { ok: false, error: err.message };
  } finally {
    isRunningCycle = false;
  }
}

export function initScheduler() {
  if (globalThis.__duo_scheduler_initialized__) {
    return;
  }
  globalThis.__duo_scheduler_initialized__ = true;
  console.log("[Scheduler] 极简自动守护定时器启动完成 (每 30 秒核对规则)...");

  // 延迟 4 秒执行初次检测
  setTimeout(() => {
    runAutoCheckCycle().catch(console.error);
  }, 4000);

  // 每 30 秒执行一次时间轮询核对
  setInterval(() => {
    runAutoCheckCycle().catch(console.error);
  }, 30 * 1000);
}

initScheduler();
