/**
 * 多邻国核心交互模块 (Duolingo API Driver)
 * 支持查询状态与根据设定经验(targetXp)自动通关打卡
 */

const DUO_BASE = "https://www.duolingo.com/2017-06-30";

export function getUserIdFromJwt(jwt) {
  if (!jwt || typeof jwt !== 'string') {
    throw new Error("无效的 JWT Token");
  }
  const parts = jwt.split('.');
  if (parts.length < 2) {
    throw new Error("JWT 格式不正确，缺少分段");
  }
  let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) base64 += '=';
  const decoded = Buffer.from(base64, 'base64').toString('utf-8');
  const json = JSON.parse(decoded);
  if (!json.sub) {
    throw new Error("JWT 未包含 sub 字段 (User ID)");
  }
  return json.sub;
}

export function getTodayDateString(timeZone = 'Asia/Shanghai') {
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

export function getCommonHeaders(jwt) {
  return {
    "Authorization": `Bearer ${jwt}`,
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    "Content-Type": "application/json",
    "Accept": "application/json"
  };
}

/**
 * 查询多邻国用户状态与今日打卡情况
 */
export async function checkUserStatus(jwt) {
  const userId = getUserIdFromJwt(jwt);
  const userUrl = `${DUO_BASE}/users/${userId}?fields=streak,totalXp,fromLanguage,learningLanguage,streakData,username,name,picture,xpGains`;
  
  const res = await fetch(userUrl, {
    method: "GET",
    headers: getCommonHeaders(jwt)
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`多邻国 API 响应错误 (HTTP ${res.status}): ${errText || res.statusText}`);
  }

  const userData = await res.json();
  const timeZone = userData.streakData?.updatedTimeZone || 'Asia/Shanghai';
  const todayStr = getTodayDateString(timeZone);

  const lastExtendedDate = userData.streakData?.currentStreak?.lastExtendedDate;
  const hasExtendedFlag = userData.streakData?.currentStreak?.hasExtendedToday;

  // 严格比对今日是否已完成练习
  const hasExtendedToday = hasExtendedFlag === true || lastExtendedDate === todayStr;

  return {
    userId,
    username: userData.username || '',
    name: userData.name || userData.username || '多邻国学员',
    picture: userData.picture || '',
    streak: userData.streak || 0,
    totalXp: userData.totalXp || 0,
    fromLanguage: userData.fromLanguage || 'zh',
    learningLanguage: userData.learningLanguage || 'en',
    timeZone,
    todayDate: todayStr,
    lastExtendedDate: lastExtendedDate || '无记录',
    hasExtendedToday,
    streakData: userData.streakData || null,
    xpGains: userData.xpGains || []
  };
}

/**
 * 执行自动通关打卡，支持指定目标经验 (targetXp)
 */
export async function executeLessonPunch(jwt, { force = false, targetXp = 15 } = {}) {
  const steps = [];
  const log = (msg) => {
    steps.push({ time: new Date().toLocaleTimeString('zh-CN'), message: msg });
  };

  log("正在查询当前账号状态与连胜数据...");
  const status = await checkUserStatus(jwt);
  log(`已获取用户信息：${status.name} (@${status.username})，当前连胜 ${status.streak} 天，总经验 ${status.totalXp} XP`);

  if (status.hasExtendedToday && !force) {
    log(`检测到今日（${status.todayDate}）连胜已点亮，安全无忧，无需补卡！`);
    return {
      ok: true,
      action: "skipped",
      reason: "今日连胜已保持",
      status,
      steps
    };
  }

  const target = Math.max(10, Number(targetXp) || 15);
  log(`启动通关打卡，设定目标经验：${target} XP...`);

  let totalGainedXp = 0;
  let lessonCount = 0;
  const maxLessons = Math.min(10, Math.ceil(target / 10)); // 保护限制，最多单次10节

  while (totalGainedXp < target && lessonCount < maxLessons) {
    lessonCount++;
    log(`正在申请第 ${lessonCount} 节练习关卡 (课程: ${status.learningLanguage})...`);

    const sessionPayload = {
      challengeTypes: ["translate", "listenTap", "judge", "form", "select"],
      fromLanguage: status.fromLanguage,
      learningLanguage: status.learningLanguage,
      isFinalLevel: false,
      isV2: true,
      juicy: true,
      smartTipsVersion: 2,
      type: "GLOBAL_PRACTICE"
    };

    const sRes = await fetch(`${DUO_BASE}/sessions`, {
      method: "POST",
      headers: getCommonHeaders(jwt),
      body: JSON.stringify(sessionPayload)
    });

    if (!sRes.ok) {
      const errText = await sRes.text().catch(() => '');
      throw new Error(`关卡初始化失败 (HTTP ${sRes.status}): ${errText || sRes.statusText}`);
    }

    const session = await sRes.json();
    const nowSec = Math.floor(Date.now() / 1000);
    const simulatedDuration = 60 + Math.floor(Math.random() * 10);

    const completePayload = {
      ...session,
      heartsLeft: 5,
      startTime: nowSec - simulatedDuration,
      endTime: nowSec,
      enableBonusPoints: false,
      failed: false,
      maxInLessonStreak: 9,
      shouldLearnThings: true
    };

    const putRes = await fetch(`${DUO_BASE}/sessions/${session.id}`, {
      method: "PUT",
      headers: getCommonHeaders(jwt),
      body: JSON.stringify(completePayload)
    });

    if (!putRes.ok) {
      const errText = await putRes.text().catch(() => '');
      throw new Error(`服务器结算未通过 (HTTP ${putRes.status}): ${errText || putRes.statusText}`);
    }

    const putData = await putRes.json();
    const gained = putData.xpGain || 13;
    totalGainedXp += gained;
    log(`第 ${lessonCount} 关通过，斩获 +${gained} XP (已累积 +${totalGainedXp}/${target} XP)`);

    // 关卡间微小间隔
    if (totalGainedXp < target && lessonCount < maxLessons) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  const newStreak = status.hasExtendedToday ? status.streak : (status.streak + 1);
  const newTotalXp = status.totalXp + totalGainedXp;

  log(`🎉 通关完毕！共完成 ${lessonCount} 节课，总计获得 +${totalGainedXp} XP！`);
  log(`🔥 连胜刷新至：${newStreak} 天！总经验：${newTotalXp} XP！`);

  return {
    ok: true,
    action: "completed",
    lessonCount,
    gainedXp: totalGainedXp,
    targetXp: target,
    newStreak,
    newTotalXp,
    previousStreak: status.streak,
    punchTime: new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
    status: {
      ...status,
      streak: newStreak,
      totalXp: newTotalXp,
      hasExtendedToday: true
    },
    steps
  };
}
