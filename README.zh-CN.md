<div align="center">

# 🦉 DuoGuardian · 多邻国连胜守护系统

**一款专为多邻国学习者打造的智能连胜终极守护系统：支持精美现代 Web 控制台、多重定时打卡防线与飞书原生互动卡片推送。**

[English](./README.md) • [简体中文](./README.zh-CN.md)

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16.3-black?style=flat-square&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/Node.js-%3E%3D18.18-green?style=flat-square&logo=node.js" alt="Node.js" />
  <img src="https://img.shields.io/badge/Duolingo-Streak_Guardian-58CC02?style=flat-square&logo=duolingo" alt="Duolingo" />
  <img src="https://img.shields.io/badge/License-MIT-blue?style=flat-square" alt="License" />
</p>

</div>

---

## 📖 项目简介

**DuoGuardian (绿鸟维稳局)** 是一套专为多邻国（Duolingo）用户研发的自动化连胜维持与监控系统。

许多学员经常因工作繁忙、深夜遗忘或外出而意外断签，导致数月乃至数千天的连胜火苗熄灭。DuoGuardian 提供了极简且优雅的 Web 控制台，支持随时随地查询连胜状态、手动一键通关、自定义每日多重防线规则，并在打卡完成后将排版精美的卡片战报直接推送至**飞书**自建应用。

---

## ✨ 核心特性

- 🔥 **智能自动通关守护**：多邻国云端协议驱动，自动检测当天学习进度。若未完成打卡，系统将在防线时间自动完成课程练习，斩获经验并续上连胜火苗。
- 🔒 **单日防重复打卡原则**：严格执行“一天仅打卡一次”的铁律，今日只要已完成打卡，后续巡检立即静默跳过，绝不多刷经验、不打扰用户。
- ⏰ **双重打卡时段防线**：
  - **平日晚间防线（周一至周六）**：默认 23:00 初次预警检测，若仍未打卡，隔 10 分钟在 23:10 自动替您打卡保底。
  - **周日专属防线**：针对周日联赛下午结算机制，默认 17:00 初次检测，17:10 自动打卡，确保周榜结算前连胜稳固。
  - **日常周期巡检**：全天候默认每 5 个小时自动巡视一次账号打卡状态。
- 📨 **飞书自建机器人卡片推送**：直连飞书 Open API 发送绿色/红色交互式卡片，无需经由任何第三方转发服务，战报内容清晰秒级送达。
- 🎨 **现代化极简设计美学**：
  - 支持 **深色模式 / 浅色模式 / 跟随系统** 瞬时无缝切换。
  - 自由平滑的时间输入组件：中间冒号 `:` 恒定常驻、不可误删，且绝不弹出浏览器原生巨型滚轮弹窗。
  - 响应式适配：完美兼容桌面宽屏、平板以及移动端小屏（<= 425px）。
- 🛡️ **严格的隐私与安全隔离**：
  - **数据脱敏**：多邻国 JWT Token 与飞书 App Secret 在前后端交互中始终做掩码处理，杜绝网络嗅探明文泄露。
  - **防掩码覆盖**：前端保存配置时即使携带掩码，服务端底层引擎会自动识别并保留原始真实凭据，绝不丢失。
  - **版本库物理隔离**：`.gitignore` 严格排除了 `data/` 生产运行文件与任何 `.env` 文件。
- ☁️ **Google Apps Script 备用方案**：在 `scripts/` 目录下同步附带了纯净版 GAS 单文件脚本，供需要部署在 Google 云端的用户使用。

---

## 🛠️ 技术栈

- **框架**：[Next.js 16](https://nextjs.org/) (App Router, Server Components & Route Handlers)
- **前端开发**：[React 19](https://react.dev/) + 原生 Vanilla CSS（玻璃拟态、微动效与定制设计规范）
- **调度引擎**：Node.js 原生单例守护定时器（每 30 秒高精时间校验）
- **持久化方案**：本地轻量级原子 JSON 状态库（跨日动态自动清空裁剪，轻便且免数据库运维）

---

## 🚀 快速上手

### 环境要求

- [Node.js](https://nodejs.org/)（推荐版本 18.18 或更高）
- npm、pnpm 或 yarn

### 1. 克隆项目并安装依赖

```bash
git clone https://github.com/your-username/duo-guardian.git
cd duo-guardian
npm install
```

### 2. 配置环境变量

复制环境变量模版并创建本地环境配置文件：
```bash
cp .env.example .env.local
```
用编辑器打开 `.env.local` 填入您的多邻国 JWT Token 和飞书密钥（详见下方获取指南）。该文件已被 `.gitignore` 严格忽略，不会被提交或泄露。

*(注：您也可以直接启动服务后，在 Web 界面中可视化点击保存配置)*

### 3. 启动服务

```bash
npm run dev
```

启动完成后，在浏览器中打开：[http://localhost:3000](http://localhost:3000)

### 4. 本地生产打包与运行

```bash
# 编译生产打包
npm run build

# 启动生产服务
npm run start
```

### 5. 部署到 Cloudflare (Workers / Pages)

本项目已全面适配 Cloudflare 官方 **OpenNext** 全栈运行时，并已接入 **Cloudflare D1 SQL 数据库**（`duospark`）持久化存储打卡时间规则、用户凭据与打卡日志。

#### 步骤 1：数据库准备与结构初始化
当前已在 [`wrangler.jsonc`](./wrangler.jsonc) 中自动绑定您的 D1 数据库：
```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "duospark",
    "database_id": "df994474-8ed4-462c-b5a3-392c0e721573"
  }
]
```
数据库结构定义在 [`schema.sql`](./schema.sql) 中，如需重新初始化或迁移云端表，可随时执行：
```bash
npx wrangler d1 execute duospark --remote --file=./schema.sql
```

#### 步骤 2：预览与一键部署
```bash
# 1. 本地模拟 Cloudflare Worker + D1 环境预览
npm run preview

# 2. 一键构建并部署至 Cloudflare Workers
npm run deploy
```

#### ☁️ 步骤 3：Cloudflare 控制台环境变量配置
部署后，请在 Cloudflare 仪表盘控制台中进入您的 Worker：
**Settings (设置) -> Variables and Secrets (变量与机密)**，添加以下环境变量：
- `DUO_JWT_TOKEN`：您的多邻国账号 JWT Token
- `FEISHU_APP_ID`：飞书自建应用 ID
- `FEISHU_APP_SECRET`：飞书自建应用 Secret
- `FEISHU_RECEIVE_PHONE_OR_EMAIL`：（选填）推送接收人手机号或邮箱

*(注：系统内置了 Cloudflare Cron Triggers 定时巡检打卡规则，部署时将由 `wrangler.jsonc` 自动生效。)*

---

## ⚙️ 配置获取指南

### 1. 多邻国 JWT Token 获取

1. 使用 Chrome 或 Edge 浏览器登录 [多邻国网页版](https://www.duolingo.com)。
2. 按键盘 `F12` 打开“开发者工具”（或右键网页点击“检查”）。
3. 切换到 **Application**（应用）选项卡 -> 展开左侧 **Storage**（存储） -> **Cookies** -> 点击 `https://www.duolingo.com`。
4. 在右侧列表中找到名为 **`jwt_token`** 的项，复制其对应的完整字符串。
5. 将其填入 `.env.local` 的 `DUO_JWT_TOKEN=`，或在 DuoGuardian Web 控制台中点击 **“绑定 / 切换账号”** 粘贴保存。

### 2. 飞书自建机器人配置

1. 登录 [飞书开放平台](https://open.feishu.cn/)，点击 **“创建企业自建应用”**。
2. 在 **“凭证与基础信息”** 页面获取应用的 **App ID**（格式如 `cli_axxxxx`）和 **App Secret**。
3. 进入左侧 **“添加应用能力”**，添加 **“机器人”** 功能。
4. 进入左侧 **“权限管理”**，开通以下权限：
   - `im:message`（获取与发送消息）
   - `im:message:send_as_bot`（以应用机器人身份发送消息）
   - `contact:user.employee_id:readonly` 或 `contact:contact:readonly_as_app`（可选：自动识别应用管理员）
5. 创建应用版本并点击 **“发布”**。
6. 将 App ID 与 App Secret 填入 `.env.local` 或在 DuoGuardian 控制台中填入，点击 **“测试发送飞书卡片”** 验证。

---

## 📁 目录结构

```text
duo-guardian/
├── .env.example                   # 环境变量模版（已脱敏，提交至仓库）
├── .env.local                     # 本地专属环境变量（存储真实密钥，已严格被 Git 忽略）
├── app/
│   ├── api/
│   │   ├── config/route.js        # 凭据安全读写、脱敏机制与规则配置接口
│   │   ├── duo/
│   │   │   ├── check/route.js     # 实时拉取多邻国账号状态与今日打卡标识
│   │   │   ├── punch/route.js     # 自动练习做题通关与连胜更新接口
│   │   │   └── scheduler/route.js # 后台调度器状态查询
│   │   ├── feishu/test/route.js   # 飞书自建应用卡片连通性测试接口
│   │   └── history/route.js       # 今日打卡与巡检动态记录查询
│   ├── globals.css                # 深度打磨的设计规范、主题变量与响应式断点
│   ├── layout.js                  # 页面根布局、视口规范与纯净 SVG 图标
│   └── page.js                    # Web 控制台交互主界面
├── data/
│   ├── .gitkeep                   # Git 目录保持占位
│   ├── config.example.json        # 模版配置文件参考
│   ├── config.json                # 本地生产配置（严格被 .gitignore 忽略）
│   └── history.json               # 当天运行动态数据（严格被 .gitignore 忽略）
├── lib/
│   ├── config.js                  # 核心配置管理模块（支持 env 优先与掩码防覆盖）
│   ├── duolingo.js                # 多邻国云端交互驱动（查状态、做练习、结课通关）
│   ├── feishu.js                  # 飞书富文本互动卡片排版与发送引擎
│   ├── history.js                 # 当天实时动态日志缓冲器（支持跨日自动清空）
│   └── scheduler.js               # 后台高精度时间定时器单例
├── scripts/
│   └── google_apps_script_clean.js # Google Apps Script 纯净版单文件备用脚本
├── .gitignore                     # 严密的版本库忽略规则
├── package.json                   # 项目依赖与执行脚本
└── README.md                      # 项目文档
```

---

## 📡 API 接口速查

| 接口地址 | 请求方式 | 功能描述 |
| :--- | :--- | :--- |
| `/api/config` | `GET` | 获取当前巡检规则、调度器状态以及已脱敏的安全凭证 |
| `/api/config` | `POST` | 更新巡检打卡规则、目标经验值、多邻国 Token 及飞书配置 |
| `/api/duo/check` | `GET` / `POST` | 实时联网查询多邻国最新连胜天数、经验值与打卡情况 |
| `/api/duo/punch` | `POST` | 立即执行课程通关打卡，点亮连胜火苗并向飞书推送战报 |
| `/api/feishu/test` | `POST` | 向飞书管理员测试发送精美的交互式连通卡片 |
| `/api/history` | `GET` | 读取今日的巡检与打卡动态流水记录 |

---

## 🔒 隐私与安全性保障

1. **纯私有化运行**：数据完全保存在您本地设备或私有云主机上，不经过第三方中间服务器。
2. **凭据双向脱敏**：前端不论查配置还是改配置，网络包均不传输明文 Token 与 Secret。
3. **开源代码零泄露**：源码中无任何硬编码密钥，生产数据文件受 `.gitignore` 保护，放心地提交与分享代码。

---

## 📄 开源许可证

本项目基于 [MIT License](./LICENSE) 开源。欢迎 Star、Fork 或提交 Issue 与 Pull Request。

<div align="center">
  <sub>为每一位坚持学习外语的小伙伴保驾护航 · 愿连胜火苗生生不息！🔥</sub>
</div>
