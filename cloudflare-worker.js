// Cloudflare Worker 主入口文件
// 包装 OpenNext 运行时，并导出 scheduled 定时任务处理器，支持 Cloudflare Cron Triggers 自动唤醒打卡

// @ts-ignore
export * from "./.open-next/worker.js";
// @ts-ignore
import openNextWorker from "./.open-next/worker.js";

export default {
  // 1. 处理所有外部 Web 流量与 API 请求
  async fetch(request, env, ctx) {
    return openNextWorker.fetch(request, env, ctx);
  },

  // 2. 核心：处理 Cloudflare Cron Triggers 定时任务唤醒
  // 当 Cloudflare 定时器到点触发时，自动唤醒 Worker 执行多邻国巡检与自动打卡
  async scheduled(event, env, ctx) {
    console.log(`[Cloudflare Cron] 定时任务触发: cron=${event?.cron}, scheduledTime=${event?.scheduledTime}`);
    
    // 使用 ctx.waitUntil 保证异步打卡任务完整执行完毕，防止 Worker 提前休眠退出
    ctx.waitUntil(
      (async () => {
        try {
          // 内部请求 Next.js 路由 /api/duo/scheduler 执行非强制安全巡检打卡
          const cronReq = new Request("http://localhost/api/duo/scheduler?cron=1", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "User-Agent": "Cloudflare-Cron-Trigger"
            },
            body: JSON.stringify({ force: false })
          });

          const response = await openNextWorker.fetch(cronReq, env, ctx);
          const result = await response.json().catch(() => ({}));
          console.log("[Cloudflare Cron] 定时打卡巡检完毕，HTTP状态:", response.status, "结果:", JSON.stringify(result));
        } catch (err) {
          console.error("[Cloudflare Cron] 定时任务执行异常:", err);
        }
      })()
    );
  }
};
