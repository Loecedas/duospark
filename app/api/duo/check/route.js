import { NextResponse } from 'next/server';
import { getConfig, saveConfig } from '@/lib/config';
import { checkUserStatus } from '@/lib/duolingo';
import { addHistoryEntry } from '@/lib/history';
import '@/lib/scheduler'; // 确保调度器在后台运行

export async function GET(request) {
  return handleCheck(request);
}

export async function POST(request) {
  return handleCheck(request);
}

async function handleCheck(request) {
  try {
    const config = await getConfig();
    if (!config.DUO_JWT_TOKEN) {
      return NextResponse.json({
        ok: false,
        error: "未配置 DUO_JWT_TOKEN，请填入"
      }, { status: 400 });
    }

    const status = await checkUserStatus(config.DUO_JWT_TOKEN);

    // 若检测到今日已打卡，立即锁定今日打卡状态，使后台调度器进入完全休眠
    if (status.hasExtendedToday) {
      await saveConfig({
        schedule: {
          ...config.schedule,
          lastPunchedDate: status.todayDate,
          lastCheckDate: status.todayDate,
          lastCheckResult: `今日已打卡，连胜安全 (${status.streak}天)`
        }
      });
    }

    await addHistoryEntry({
      type: "CHECK",
      title: "手动检测连胜状态",
      status: status.hasExtendedToday ? "SECURE" : "WARNING",
      streak: status.streak,
      xp: status.totalXp,
      hasExtendedToday: status.hasExtendedToday,
      details: status.hasExtendedToday 
        ? `今日连胜已保住 (${status.streak}天)，经验 ${status.totalXp} XP` 
        : `⚠️ 提示：今日连胜尚未完成打卡！`
    });

    return NextResponse.json({
      ok: true,
      data: status
    });
  } catch (err) {
    console.error("Duo check error:", err);
    await addHistoryEntry({
      type: "CHECK",
      title: "检测账号失败",
      status: "ERROR",
      details: err.message
    });
    return NextResponse.json({
      ok: false,
      error: err.message
    }, { status: 500 });
  }
}
