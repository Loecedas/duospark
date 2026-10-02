import { NextResponse } from 'next/server';
import { getConfig, saveConfig } from '@/lib/config';
import { executeLessonPunch, getTodayDateString } from '@/lib/duolingo';
import { notifyFeishuCard } from '@/lib/feishu';
import { addHistoryEntry } from '@/lib/history';
import '@/lib/scheduler'; // 确保调度器后台运行

export async function POST(request) {
  try {
    const config = await getConfig();
    if (!config.DUO_JWT_TOKEN) {
      return NextResponse.json({
        ok: false,
        error: "未配置多邻国账号 Token，请填入"
      }, { status: 400 });
    }

    let force = false;
    let notify = true;
    let targetXp = config.schedule?.targetXp || 15;

    try {
      const body = await request.json();
      if (body.force !== undefined) force = Boolean(body.force);
      if (body.notify !== undefined) notify = Boolean(body.notify);
      if (body.targetXp !== undefined) targetXp = Number(body.targetXp);
    } catch {}

    const result = await executeLessonPunch(config.DUO_JWT_TOKEN, { force, targetXp });

    let feishuResult = null;

    // 每次打卡完成或执行，均自动向飞书推送最新详细战报
    if (result.action === "completed") {
      const todayDate = getTodayDateString('Asia/Shanghai');
      const lines = [
        `🎉 **多邻国今日打卡已圆满完成！**`,
        `🔥 连胜天数：**${result.newStreak} 天**`,
        `⚡ 本次斩获：**+${result.gainedXp} XP** (${result.lessonCount} 节课)`,
        `⭐ 累计经验已刷新：**${result.newTotalXp} XP**`,
        `🕒 打卡时间：${result.punchTime}`,
        `🔒 **防重复保护生效**：今日打卡已达成，后续不再重复打卡。`
      ];

      feishuResult = await notifyFeishuCard({
        isSuccess: true,
        title: "多邻国 · 打卡成功战报",
        lines
      }, config.FEISHU);

      // 锁定今日打卡状态
      await saveConfig({
        schedule: {
          ...config.schedule,
          lastPunchedDate: todayDate,
          lastCheckDate: todayDate,
          lastCheckResult: `打卡成功 +${result.gainedXp}XP，连胜 ${result.newStreak} 天`
        }
      });
    }

    await addHistoryEntry({
      type: result.action === "completed" ? "MANUAL_PUNCH" : "SKIPPED",
      title: result.action === "completed" ? "打卡通关成功" : "跳过通关 (连胜已保住)",
      status: result.action === "completed" ? "SUCCESS" : "SKIPPED",
      streak: result.status.streak,
      xp: result.status.totalXp,
      gainedXp: result.gainedXp || 0,
      details: result.action === "completed"
        ? `完成 ${result.lessonCount} 关，获得 ${result.gainedXp} XP，当前连胜 ${result.newStreak} 天`
        : result.reason,
      feishuSent: feishuResult?.ok ?? false
    });

    return NextResponse.json({
      ok: true,
      result,
      feishuResult
    });
  } catch (err) {
    console.error("Duo punch error:", err);
    await addHistoryEntry({
      type: "ERROR",
      title: "打卡通关失败",
      status: "ERROR",
      details: err.message
    });
    return NextResponse.json({
      ok: false,
      error: err.message
    }, { status: 500 });
  }
}
