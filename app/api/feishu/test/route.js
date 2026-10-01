import { NextResponse } from 'next/server';
import { getConfig } from '@/lib/config';
import { notifyFeishuCard } from '@/lib/feishu';
import { addHistoryEntry } from '@/lib/history';

export async function POST(request) {
  try {
    const config = getConfig();
    let customConf = { ...config.FEISHU };

    try {
      const body = await request.json();
      if (body.appId) customConf.APP_ID = body.appId;
      if (body.appSecret && !body.appSecret.includes('****')) {
        customConf.APP_SECRET = body.appSecret;
      }
      if (body.phoneOrEmail !== undefined) customConf.RECEIVE_PHONE_OR_EMAIL = body.phoneOrEmail;
    } catch {}

    const timeStr = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
    const sendResult = await notifyFeishuCard({
      isSuccess: true,
      title: "多邻国打卡守护 · 飞书测试卡片",
      lines: [
        `🤖 **恭喜！飞书机器人通讯链路正常**`,
        `🕒 发送时间：${timeStr}`,
        `📌 控制台：每日自动检测打卡与飞书战报已连通`,
        `💡 提示：系统将在设定的打卡时间自动检测连胜并在打卡后发送战报到此处。`
      ]
    }, customConf);

    addHistoryEntry({
      type: "FEISHU_TEST",
      title: "飞书测试推送",
      status: sendResult.ok ? "SUCCESS" : "ERROR",
      details: sendResult.ok ? "测试卡片推送成功" : (sendResult.reason || sendResult.error)
    });

    if (!sendResult.ok) {
      return NextResponse.json({
        ok: false,
        error: sendResult.error || sendResult.reason || "推送失败，请检查配置"
      }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      data: {
        ok: true,
        receiverType: sendResult.receiver?.type || 'unknown'
      }
    });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: err.message
    }, { status: 500 });
  }
}
