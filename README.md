<div align="center">

# 🦉 DuoGuardian · 多邻国连胜守护系统

**An intelligent, lightweight, automated Duolingo streak guardian with real-time web dashboard & Feishu (Lark) rich card notifications.**

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

## 📖 Introduction

**DuoGuardian** is an automated Duolingo streak maintenance system designed for learners who want to ensure their Duolingo streak flames never extinguish. 

It provides an elegant, modern Web Console to manage accounts, check streak status, inspect real-time progress, configure dual-layer defense schedules, and push detailed interactive cards directly to your **Feishu / Lark** workspace.

---

## ✨ Key Features

- 🔥 **Automated Streak Protection**: Automatically queries Duolingo cloud APIs and simulates lesson practices to keep your streak intact if you forget to practice.
- 🔒 **Strict Single-Punch Guarantee**: Once today's lesson is completed, further punch attempts are immediately skipped to avoid repetitive XP inflation.
- ⏰ **Dual-Line Smart Defense**:
  - **Weekday Defense (Mon–Sat)**: Pre-warning inspection at 23:00; automatic lesson completion at 23:10 if unfinished.
  - **Sunday Settlement Defense**: Pre-warning at 17:00; automatic punch at 17:10 before the weekly leaderboard结算.
  - **Patrol Mode**: Routine background check every 5 hours (fully customizable).
- 📨 **Direct Feishu / Lark Card Notifications**: Pushes rich markdown notification cards directly to the app administrator without requiring any third-party relay service.
- 🎨 **Premium Modern Web Dashboard**:
  - Dark / Light / Follow System theme switcher.
  - Smooth formatted time input with permanent colon separator (no browser-native wheel popups).
  - Responsive design across desktop, tablet, and mobile screens (<= 425px).
- 🛡️ **Privacy & Credential Isolation**:
  - **Outbound Masking**: Raw JWT tokens and Feishu App Secrets are masked before sending to the client browser.
  - **Overwrite Protection**: Submitting masked values will never overwrite active secrets in the database.
  - **VCS Isolation**: `.gitignore` strictly isolates runtime databases (`data/config.json`, `data/history.json`).
- ☁️ **Google Apps Script Backup**: Includes a standalone, serverless script in `scripts/` for optional cloud execution.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Server Components & Route Handlers)
- **Frontend**: [React 19](https://react.dev/), Vanilla CSS Design Tokens (Glassmorphism & Micro-animations)
- **Runtime & Engine**: Node.js (with built-in singleton background scheduler)
- **Database / Cache**: Lightweight atomic local JSON storage with automated daily pruning

---

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) (version 18.18 or higher)
- npm, pnpm, or yarn

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/your-username/duo-guardian.git
cd duo-guardian
npm install
```

### 2. Configure Environment Variables

Copy the template to create your local environment file:
```bash
cp .env.example .env.local
```
Fill in your Duolingo JWT Token and Feishu App credentials (see the Configuration Guide below). This file is strictly excluded by `.gitignore` and will never be committed to Git.

*(Note: You can also configure and save credentials directly via the interactive Web Console UI)*

### 3. Start the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Production Build & Deployment

```bash
# Build the production bundle
npm run build

# Start the production server
npm run start
```

---

## ⚙️ Configuration Guide

### 1. Duolingo JWT Token

1. Open [Duolingo Web](https://www.duolingo.com) in Chrome/Edge and log into your account.
2. Press `F12` to open Developer Tools.
3. Go to the **Application** (应用) tab -> **Storage** -> **Cookies** -> `https://www.duolingo.com`.
4. Locate the cookie named **`jwt_token`** and copy its value.
5. Paste it into `.env.local` as `DUO_JWT_TOKEN=` or click **"Bind / Switch Account"** on the Web Console.

### 2. Feishu (Lark) Self-Built Bot

1. Go to the [Feishu Open Platform](https://open.feishu.cn/) and click **"Create Enterprise Self-Built App"**.
2. Under **Credentials & Basic Info**, copy your **App ID** (e.g., `cli_axxxxx`) and **App Secret**.
3. Under **Add Features**, add the **Bot** feature.
4. Under **Permission Management**, search for and enable:
   - `im:message` (Send and receive messages)
   - `im:message:send_as_bot` (Send messages as application robot)
   - `contact:user.employee_id:readonly` / `contact:contact:readonly_as_app` (Optional: Read user info)
5. Create an app version and publish it.
6. Paste the App ID and App Secret into `.env.local` or directly in the Web Console, then click **"Test Feishu Card"**.

---

## 📁 Project Structure

```text
duo-guardian/
├── .env.example                   # Environment variable template (Committed to Git)
├── .env.local                     # Local private secrets (Strictly Git-ignored)
├── app/
│   ├── api/
│   │   ├── config/route.js        # Safe configuration read/write with secret masking
│   │   ├── duo/
│   │   │   ├── check/route.js     # User status & streak verification
│   │   │   ├── punch/route.js     # Lesson execution & streak punching
│   │   │   └── scheduler/route.js # Background scheduler control
│   │   ├── feishu/test/route.js   # Feishu card push connectivity test
│   │   └── history/route.js       # Real-time activity log query
│   ├── globals.css                # Curated design tokens, themes & layout styles
│   ├── layout.js                  # Root layout with responsive viewport & favicon
│   └── page.js                    # Main interactive console dashboard
├── data/
│   ├── .gitkeep                   # Ensures data directory exists
│   ├── config.example.json        # Template configuration schema
│   ├── config.json                # User active configuration (Strictly Git-ignored)
│   └── history.json               # Daily operational activity log (Strictly Git-ignored)
├── lib/
│   ├── config.js                  # Configuration store with env & mask overwrite protection
│   ├── duolingo.js                # Duolingo API reverse-engineered interaction driver
│   ├── feishu.js                  # Feishu interactive card delivery engine
│   ├── history.js                 # Same-day log buffer & auto-pruning
│   └── scheduler.js               # Background singleton precision timer
├── scripts/
│   └── google_apps_script_clean.js # Standalone Google Apps Script alternative
├── .gitignore                     # Security hardened git exclusion rules
├── package.json                   # Dependencies and scripts
└── README.md                      # Documentation
```

---

## 📡 API Reference

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/config` | `GET` | Fetches system status, scheduler info, and masked credentials. |
| `/api/config` | `POST` | Updates defense rules, XP targets, and credentials safely. |
| `/api/duo/check` | `GET` / `POST` | Queries live Duolingo account profile, streak days, and today's status. |
| `/api/duo/punch` | `POST` | Triggers immediate lesson practice and punches today's streak flame. |
| `/api/feishu/test` | `POST` | Sends a real-time interactive test card to the Feishu administrator. |
| `/api/history` | `GET` | Returns today's activity logs (automatically cleaned across days). |

---

## 🔒 Security & Privacy

1. **No Cloud Dependency**: DuoGuardian runs locally on your device or private VPS.
2. **Never Sends Plaintext Secrets to UI**: All credentials (`DUO_JWT_TOKEN`, `FEISHU.APP_SECRET`) are masked before transmission.
3. **Protected Commits**: Sensitive data directories (`data/*.json`, `.env*`) are strictly blocked by `.gitignore`.

---

## 📄 License

This project is open-sourced under the [MIT License](./LICENSE).

<div align="center">
  <sub>Built with ❤️ for passionate language learners around the world. Keep your streak burning! 🔥</sub>
</div>
