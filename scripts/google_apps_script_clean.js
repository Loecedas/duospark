/**
 * ==============================================================================
 * 绿鸟维稳局 · 多邻国连胜终极守护系统 (Google Apps Script 版)
 * ==============================================================================
 * 执勤逻辑：
 * 1. 每日定时巡检。
 * 2. 检测到今日已学过，静默退出，绝不打扰。
 * 3. 检测到今日未打卡，立即自动完成主线练习，保住连胜火苗。
 * 4. 纯净单列流式排版，只留核心战报，绝无多余废话。
 * ==============================================================================
 */

// =================================== 配置区 ===================================
const CONFIG = {
  // 1. 多邻国 JWT Token（请在此填入您的真实 Duolingo JWT Token）
  DUO_JWT_TOKEN: "",

  // 2. 飞书自建应用配置（绿鸟维稳局）
  FEISHU: {
    APP_ID: "",
    APP_SECRET: "",
    // 选填：在飞书开通「管理应用自身资源」权限后留空即可；也可填飞书手机号
    RECEIVE_PHONE_OR_EMAIL: "" 
  },

  // 3. 微信推送加 (PushPlus) Token（微信扫码 pushplus.plus 获取）
  PUSHPLUS_TOKEN: ""
};
// ==============================================================================

const DUO_BASE = "https://www.duolingo.com/2017-06-30";

/**
 * 主执行入口：每日定时自动执行
 */
function advanceHomeLesson() {
  const userId = getUserIdFromJwt(CONFIG.DUO_JWT_TOKEN);
  Logger.log(`[绿鸟维稳局] 自动解密 User ID: ${userId}`);

  const commonHeaders = {
    "Authorization": `Bearer ${CONFIG.DUO_JWT_TOKEN}`,
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    "Content-Type": "application/json",
    "Accept": "application/json"
  };

  try {
    // 1. 查询当前用户今日连胜状态
    const userUrl = `${DUO_BASE}/users/${userId}?fields=streak,totalXp,fromLanguage,learningLanguage,streakData`;
    const userRes = UrlFetchApp.fetch(userUrl, { headers: commonHeaders, muteHttpExceptions: true });

    if (userRes.getResponseCode() !== 200) {
      notifyFeishuCard({
        isSuccess: false,
        title: "绿鸟维稳局 · 鉴权失效",
        lines: [
          `⚠️ 错误原因：多邻国 Token 已失效 (HTTP ${userRes.getResponseCode()})`,
          `🕒 检查时间：${getFormattedTime()}`,
          `📌 解决办法：请重新从网页端复制更新 DUO_JWT_TOKEN`
        ]
      });
      return;
    }

    const userData = JSON.parse(userRes.getContentText());
    const currentStreak = userData.streak || 0;
    const currentXp = userData.totalXp || 0;
    const fromLang = userData.fromLanguage || "zh";
    const learningLang = userData.learningLanguage || "en";

    // 2. 核心智能判定：如果今日已经打过卡了，直接静默退出，不重复打扰
    const hasExtendedToday = userData.streakData?.currentStreak?.hasExtendedToday ?? false;
    if (hasExtendedToday) {
      Logger.log(`[绿鸟维稳局] 检测到今日连胜已点亮（当前连胜 ${currentStreak} 天），安全无忧，无需救火，静默退出。`);
      return;
    }

    Logger.log(`[绿鸟维稳局] 警戒：今日尚未打卡，立即出击启动救援...`);

    // 3. 创建练习 Session 题目包
    const sessionPayload = {
      challengeTypes: ["translate", "listenTap", "judge", "form", "select"],
      fromLanguage: fromLang,
      learningLanguage: learningLang,
      isFinalLevel: false,
      isV2: true,
      juicy: true,
      smartTipsVersion: 2,
      type: "GLOBAL_PRACTICE"
    };

    const sRes = UrlFetchApp.fetch(`${DUO_BASE}/sessions`, {
      method: "post",
      headers: commonHeaders,
      payload: JSON.stringify(sessionPayload),
      muteHttpExceptions: true
    });

    if (sRes.getResponseCode() !== 200) {
      notifyFeishuCard({
        isSuccess: false,
        title: "绿鸟维稳局 · 关卡初始化失败",
        lines: [
          `🔥 连胜天数：${currentStreak} 天`,
          `⚠️ 错误原因：请求题库失败 (HTTP ${sRes.getResponseCode()})`,
          `🕒 发生时间：${getFormattedTime()}`
        ]
      });
      return;
    }

    const session = JSON.parse(sRes.getContentText());

    // 4. 模拟真人作答耗时
    const nowSec = Math.floor(Date.now() / 1000);
    const completePayload = {
      ...session,
      heartsLeft: 5,
      startTime: nowSec - 65,
      endTime: nowSec,
      enableBonusPoints: false,
      failed: false,
      maxInLessonStreak: 9,
      shouldLearnThings: true
    };

    // 5. 提交完成包
    const putRes = UrlFetchApp.fetch(`${DUO_BASE}/sessions/${session.id}`, {
      method: "put",
      headers: commonHeaders,
      payload: JSON.stringify(completePayload),
      muteHttpExceptions: true
    });

    const punchTime = getFormattedTime();

    if (putRes.getResponseCode() === 200) {
      const putData = JSON.parse(putRes.getContentText());
      const gainedXp = putData.xpGain || 13;
      const finalStreak = currentStreak + 1;
      const finalTotalXp = currentXp + gainedXp;
      
      const cardPayload = {
        isSuccess: true,
        title: "绿鸟维稳局 · 连胜守护成功",
        lines: [
          `🔥 连胜天数：**${finalStreak} 天**`,
          `⚡ 本次获得：**+${gainedXp} XP**`,
          `⭐ 总经验已同步：**${finalTotalXp} XP**`,
          `🕒 打卡时间：${punchTime}`,
          `📌 当前状态：今日已打卡，连胜已保住`
        ]
      };
      notifyFeishuCard(cardPayload);
      notifyPushPlus(cardPayload);
      Logger.log("[绿鸟维稳局] 救火成功并已发送战报。");
    } else {
      const failPayload = {
        isSuccess: false,
        title: "绿鸟维稳局 · 提交通关未通过",
        lines: [
          `🔥 连胜天数：${currentStreak} 天`,
          `⚠️ 错误原因：服务器结算未通过 (HTTP ${putRes.getResponseCode()})`,
          `🕒 发生时间：${punchTime}`
        ]
      };
      notifyFeishuCard(failPayload);
      notifyPushPlus(failPayload);
    }

  } catch (err) {
    notifyFeishuCard({
      isSuccess: false,
      title: "绿鸟维稳局 · 异常告警",
      lines: [
        `⚠️ 异常信息：${err.message}`,
        `🕒 发生时间：${getFormattedTime()}`
      ]
    });
  }
}

/**
 * 专门用于测试飞书推送的独立函数 (直接在 GAS 顶部选中并点运行测试)
 */
function testFeishu() {
  notifyFeishuCard({
    isSuccess: true,
    title: "绿鸟维稳局 · 连胜守护成功",
    lines: [
      `🔥 连胜天数：**1 天**`,
      `⚡ 本次获得：**+13 XP**`,
      `⭐ 总经验已同步：**37 XP**`,
      `🕒 打卡时间：${getFormattedTime()}`,
      `📌 当前状态：今日已打卡，连胜已保住`
    ]
  });
}

/**
 * 获取标准格式时间 (例: 2026-09-15 22:00:15)
 */
function getFormattedTime() {
  return Utilities.formatDate(new Date(), "GMT+8", "yyyy-MM-dd HH:mm:ss");
}

/**
 * 从 JWT 中原生 Base64 解密出 user ID
 */
function getUserIdFromJwt(jwt) {
  try {
    const parts = jwt.split('.');
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) base64 += '=';
    const decoded = Utilities.newBlob(Utilities.base64Decode(base64)).getDataAsString();
    return JSON.parse(decoded).sub;
  } catch (e) {
    throw new Error("JWT 格式错误，无法解析 User ID");
  }
}

/**
 * 获取飞书凭证
 */
function getFeishuToken() {
  const feishu = CONFIG.FEISHU;
  const url = "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal";
  const res = UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json; charset=utf-8",
    payload: JSON.stringify({
      app_id: feishu.APP_ID,
      app_secret: feishu.APP_SECRET
    }),
    muteHttpExceptions: true
  });
  const json = JSON.parse(res.getContentText());
  if (json.code !== 0) throw new Error(`飞书鉴权失败: ${json.msg}`);
  return json.tenant_access_token;
}

/**
 * 确定飞书接收人
 */
function resolveFeishuReceiver(token) {
  const feishu = CONFIG.FEISHU;

  if (feishu.RECEIVE_PHONE_OR_EMAIL) {
    const val = feishu.RECEIVE_PHONE_OR_EMAIL.trim();
    if (val.includes("@")) return { type: "email", id: val };
    return { type: "phone", id: val };
  }

  try {
    const url = `https://open.feishu.cn/open-apis/application/v6/applications/${feishu.APP_ID}/collaborators?user_id_type=open_id`;
    const res = UrlFetchApp.fetch(url, {
      method: "get",
      headers: { "Authorization": `Bearer ${token}` },
      muteHttpExceptions: true
    });
    const json = JSON.parse(res.getContentText());
    if (json.code === 0 && json.data?.collaborators?.length > 0) {
      const admin = json.data.collaborators.find(c => c.type === "administrator") || json.data.collaborators[0];
      return { type: "open_id", id: admin.user_id };
    }
  } catch (e) {
    Logger.log("自动解析管理员失败: " + e.message);
  }

  return null;
}

/**
 * 单列原生流式卡片渲染引擎（专为手机端打造，无折行拥挤，清晰有力）
 */
function notifyFeishuCard(opts) {
  const feishu = CONFIG.FEISHU;
  if (!feishu.APP_ID || feishu.APP_ID.includes("xxxxxxxx")) return;

  try {
    const token = getFeishuToken();
    const receiver = resolveFeishuReceiver(token);
    if (!receiver) {
      Logger.log("【推送跳过】未解析到接收人。请在 CONFIG.FEISHU.RECEIVE_PHONE_OR_EMAIL 填入你的飞书手机号。");
      return;
    }

    const sendUrl = `https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=${receiver.type}`;

    const cardObj = {
      config: { wide_screen_mode: true },
      header: {
        title: { tag: "plain_text", content: opts.title },
        template: opts.isSuccess ? "green" : "red"
      },
      elements: [
        {
          tag: "div",
          text: {
            tag: "lark_md",
            content: opts.lines.join("\n\n")
          }
        },
        {
          tag: "note",
          elements: [
            { tag: "plain_text", content: "来自「绿鸟维稳局」全自动防断执勤" }
          ]
        }
      ]
    };

    const sendRes = UrlFetchApp.fetch(sendUrl, {
      method: "post",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json; charset=utf-8"
      },
      payload: JSON.stringify({
        receive_id: receiver.id,
        msg_type: "interactive",
        content: JSON.stringify(cardObj)
      }),
      muteHttpExceptions: true
    });

    const sendJson = JSON.parse(sendRes.getContentText());
    if (sendJson.code === 0) {
      Logger.log("🎉 绿鸟维稳局单列战报推送成功！");
    } else {
      Logger.log(`推送返回未成功: [${sendJson.code}] ${sendJson.msg}`);
    }
  } catch (e) {
    Logger.log("飞书发送异常: " + e.message);
  }
}

/**
 * 微信 PushPlus 战报推送函数
 */
function notifyPushPlus(opts) {
  const token = CONFIG.PUSHPLUS_TOKEN;
  if (!token || !token.trim()) return;

  try {
    const url = "https://www.pushplus.plus/send";
    let md = `### ${opts.isSuccess ? '✅' : '⚠️'} ${opts.title || '绿鸟维稳局 · 连胜守护战报'}\n\n`;
    if (opts.lines) {
      md += opts.lines.map(l => `> ${l}`).join("\n\n");
    }
    md += `\n\n---\n*来自「绿鸟维稳局」全自动保活执勤*`;

    const res = UrlFetchApp.fetch(url, {
      method: "post",
      headers: { "Content-Type": "application/json" },
      payload: JSON.stringify({
        token: token.trim(),
        title: opts.title || "绿鸟维稳局 · 连胜守护战报",
        content: md,
        template: "markdown"
      }),
      muteHttpExceptions: true
    });

    const json = JSON.parse(res.getContentText());
    if (json.code === 200) {
      Logger.log("🎉 微信 PushPlus 战报推送成功！");
    } else {
      Logger.log("微信 PushPlus 推送失败: " + json.msg);
    }
  } catch (e) {
    Logger.log("微信 PushPlus 推送异常: " + e.message);
  }
}

