/**
 * 飞书自建应用卡片通知服务
 */

export async function getFeishuToken(feishu) {
  if (!feishu?.APP_ID || !feishu?.APP_SECRET) {
    throw new Error("飞书 APP_ID 或 APP_SECRET 未配置");
  }
  const url = "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal";
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      app_id: feishu.APP_ID,
      app_secret: feishu.APP_SECRET
    })
  });
  const json = await res.json();
  if (json.code !== 0) {
    throw new Error(`飞书鉴权失败: [${json.code}] ${json.msg}`);
  }
  return json.tenant_access_token;
}

export async function resolveFeishuReceiver(token, feishu) {
  if (feishu.RECEIVE_PHONE_OR_EMAIL && feishu.RECEIVE_PHONE_OR_EMAIL.trim()) {
    const val = feishu.RECEIVE_PHONE_OR_EMAIL.trim();
    if (val.includes("@")) return { type: "email", id: val };
    return { type: "phone", id: val };
  }

  try {
    const url = `https://open.feishu.cn/open-apis/application/v6/applications/${feishu.APP_ID}/collaborators?user_id_type=open_id`;
    const res = await fetch(url, {
      method: "GET",
      headers: { "Authorization": `Bearer ${token}` }
    });
    const json = await res.json();
    if (json.code === 0 && json.data?.collaborators?.length > 0) {
      const admin = json.data.collaborators.find(c => c.type === "administrator") || json.data.collaborators[0];
      return { type: "open_id", id: admin.user_id };
    }
  } catch (e) {
    console.error("自动解析飞书管理员失败:", e.message);
  }

  return null;
}

export async function notifyFeishuCard(opts, feishu) {
  if (!feishu?.APP_ID || feishu.APP_ID.includes("xxxxxxxx")) {
    return { ok: false, skipped: true, reason: "未配置飞书 APP_ID" };
  }

  try {
    const token = await getFeishuToken(feishu);
    const receiver = await resolveFeishuReceiver(token, feishu);
    if (!receiver) {
      return {
        ok: false,
        skipped: true,
        reason: "未能解析到接收人。请在飞书配置中填写绑定的手机号或邮箱。"
      };
    }

    const sendUrl = `https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=${receiver.type}`;
    const cardObj = {
      config: { wide_screen_mode: true },
      header: {
        title: { tag: "plain_text", content: opts.title || "多邻国打卡守护战报" },
        template: opts.isSuccess ? "green" : "red"
      },
      elements: [
        {
          tag: "div",
          text: {
            tag: "lark_md",
            content: (opts.lines || []).join("\n\n")
          }
        },
        {
          tag: "note",
          elements: [
            { tag: "plain_text", content: "来自「多邻国打卡守护」每日定时自动检测与推送" }
          ]
        }
      ]
    };

    const sendRes = await fetch(sendUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json; charset=utf-8"
      },
      body: JSON.stringify({
        receive_id: receiver.id,
        msg_type: "interactive",
        content: JSON.stringify(cardObj)
      })
    });

    const sendJson = await sendRes.json();
    if (sendJson.code === 0) {
      return { ok: true, receiver, data: sendJson.data };
    } else {
      return { ok: false, error: `[${sendJson.code}] ${sendJson.msg}`, receiver };
    }
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
