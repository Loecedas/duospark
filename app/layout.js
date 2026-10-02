import './globals.css';

export const metadata = {
  title: '多邻国打卡守护 · 极简自动打卡与飞书推送',
  description: 'Duolingo Daily Streak Guardian - 定时自动检测、每日经验通关、飞书消息提醒',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🦉</text></svg>" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
