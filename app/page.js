'use client';

import { useState, useEffect, useRef } from 'react';

// 纯净自由时间输入框：采用统一标准文本框设计，点击即可自由输入、光标移动与选中；
// 核心逻辑保证中间冒号“:”恒定存在，无法被误删或打乱格式。
function TimeInput({ value, onChange }) {
  const inputRef = useRef(null);

  // 保证传入值为标准 5 位 HH:mm 格式
  const formatTime = (val) => {
    if (!val || typeof val !== 'string') return '00:00';
    const digits = val.replace(/\D/g, '').padEnd(4, '0').slice(0, 4);
    const h = Math.min(23, parseInt(digits.slice(0, 2), 10) || 0);
    const m = Math.min(59, parseInt(digits.slice(2, 4), 10) || 0);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const displayVal = value && value.includes(':') ? value : formatTime(value);

  const handleKeyDown = (e) => {
    const input = inputRef.current;
    if (!input) return;
    const start = input.selectionStart ?? 0;
    const end = input.selectionEnd ?? 0;

    // 1. 退格键 Backspace：自由删除数字，中间冒号保持恒定不被删除
    if (e.key === 'Backspace') {
      e.preventDefault();
      let chars = displayVal.split('');

      // 若有选中范围：将选中的数字重置为 0，冒号保持为 ':'
      if (start !== end) {
        for (let i = start; i < end; i++) {
          if (i !== 2) chars[i] = '0';
        }
        const next = chars.join('');
        onChange(next);
        setTimeout(() => input.setSelectionRange(start, start), 0);
        return;
      }

      // 单字符退格
      if (start === 0) return;
      let target = start - 1;
      if (target === 2) {
        // 如果光标在冒号后，直接越过冒号删除小时个位数
        target = 1;
      }
      chars[target] = '0';
      const next = chars.join('');
      onChange(next);
      setTimeout(() => input.setSelectionRange(target, target), 0);
      return;
    }

    // 2. Delete 键：向前删除数字，冒号保留
    if (e.key === 'Delete') {
      e.preventDefault();
      let chars = displayVal.split('');
      if (start !== end) {
        for (let i = start; i < end; i++) {
          if (i !== 2) chars[i] = '0';
        }
        const next = chars.join('');
        onChange(next);
        setTimeout(() => input.setSelectionRange(start, start), 0);
        return;
      }
      if (start >= 5) return;
      let target = start;
      if (target === 2) target = 3;
      chars[target] = '0';
      const next = chars.join('');
      onChange(next);
      setTimeout(() => input.setSelectionRange(target + 1, target + 1), 0);
      return;
    }

    // 3. 数字键 0-9：像普通输入框一样自由按顺序键入
    if (/^\d$/.test(e.key)) {
      e.preventDefault();
      let pos = start;
      if (pos === 2) pos = 3; // 自动跳过中间冒号
      if (pos >= 5) pos = 4;

      let chars = displayVal.split('');
      chars[pos] = e.key;

      // 智能数值上限约束（小时不超过 23，分钟不超过 59）
      let h = parseInt(chars[0] + chars[1], 10);
      if (pos <= 1) {
        if (pos === 0 && parseInt(e.key, 10) > 2) {
          chars[0] = '0';
          chars[1] = e.key;
          pos = 1;
        } else if (h > 23) {
          chars[0] = '2';
          chars[1] = '3';
        }
      }
      let m = parseInt(chars[3] + chars[4], 10);
      if (pos >= 3 && m > 59) {
        chars[3] = '5';
        chars[4] = '9';
      }

      const next = `${chars[0]}${chars[1]}:${chars[3]}${chars[4]}`;
      onChange(next);
      const nextPos = pos === 1 ? 3 : Math.min(5, pos + 1);
      setTimeout(() => input.setSelectionRange(nextPos, nextPos), 0);
      return;
    }

    // 4. 输入冒号 ':'：自动将光标移至分钟首位
    if (e.key === ':') {
      e.preventDefault();
      setTimeout(() => input.setSelectionRange(3, 3), 0);
      return;
    }

    // 5. 允许常规功能按键（方向键、全选、复制等）自由使用
    if (['ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End'].includes(e.key) || e.ctrlKey || e.metaKey) {
      return;
    }

    // 屏蔽其他非数字特殊字符
    e.preventDefault();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text');
    const digits = text.replace(/\D/g, '');
    if (!digits) return;
    const d = digits.padEnd(4, '0').slice(0, 4);
    const h = Math.min(23, parseInt(d.slice(0, 2), 10) || 0);
    const m = Math.min(59, parseInt(d.slice(2, 4), 10) || 0);
    onChange(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  };

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        className="input-field"
        style={{ 
          letterSpacing: '1px', 
          fontVariantNumeric: 'tabular-nums',
          paddingRight: '36px',
          fontWeight: '500'
        }}
        value={displayVal}
        onChange={() => {}} // 由 onKeyDown 精准受控
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onFocus={(e) => {
          // 聚焦时自动选中全部，方便一键直接打字覆盖
          setTimeout(() => e.target.select(), 0);
        }}
      />
      <span style={{ position: 'absolute', right: '12px', display: 'flex', alignItems: 'center', pointerEvents: 'none', color: 'var(--text-muted)' }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}>
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      </span>
    </div>
  );
}

export default function DuoGuardianPage() {
  // Theme state: 'system' | 'dark' | 'light'
  const [themeMode, setThemeMode] = useState('system');

  const [loadingUser, setLoadingUser] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [punching, setPunching] = useState(false);
  const [testingFeishu, setTestingFeishu] = useState(false);
  
  const [currentTime, setCurrentTime] = useState('');
  const [currentDayName, setCurrentDayName] = useState('');
  const [toast, setToast] = useState(null);

  // Core Data
  const [user, setUser] = useState(null);
  const [schedulerInfo, setSchedulerInfo] = useState(null);
  const [history, setHistory] = useState([]);

  // Form states
  const [jwt, setJwt] = useState('');
  const [showTokenInput, setShowTokenInput] = useState(false);
  
  // Schedule Form states
  const [schedEnabled, setSchedEnabled] = useState(true);
  const [intervalHours, setIntervalHours] = useState(5);
  const [normalCheckTime, setNormalCheckTime] = useState('23:00');
  const [normalPunchTime, setNormalPunchTime] = useState('23:10');
  const [sundayCheckTime, setSundayCheckTime] = useState('17:00');
  const [sundayPunchTime, setSundayPunchTime] = useState('17:10');
  const [targetXp, setTargetXp] = useState(15);
  const [customXpMode, setCustomXpMode] = useState(false);
  const [notifyOnWarning, setNotifyOnWarning] = useState(true);
  const [notifyOnSafe, setNotifyOnSafe] = useState(true);

  // Feishu Form states
  const [feishuAppId, setFeishuAppId] = useState('');
  const [feishuAppSecret, setFeishuAppSecret] = useState('');
  const [feishuReceiver, setFeishuReceiver] = useState('');
  const [showAppSecret, setShowAppSecret] = useState(false);

  // Toast helper
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  };

  const applyTheme = (mode) => {
    let resolved = 'dark';
    if (mode === 'system') {
      const prefersDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
      resolved = prefersDark ? 'dark' : 'light';
    } else {
      resolved = mode;
    }
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', resolved);
    }
  };

  // Theme Management
  useEffect(() => {
    const savedTheme = localStorage.getItem('duo_theme') || 'system';
    applyTheme(savedTheme);
    setThemeMode(savedTheme);
  }, []);

  const handleCycleTheme = () => {
    const order = ['system', 'light', 'dark'];
    const nextIdx = (order.indexOf(themeMode) + 1) % order.length;
    const nextMode = order[nextIdx];
    setThemeMode(nextMode);
    localStorage.setItem('duo_theme', nextMode);
    applyTheme(nextMode);
    
    const labels = {
      system: '跟随系统',
      light: '浅色模式',
      dark: '深色模式'
    };
    showToast(`已切换主题为：${labels[nextMode]}`, 'success');
  };

  // Listen to system theme changes if mode is 'system'
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if (themeMode === 'system') {
        applyTheme('system');
      }
    };
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [themeMode]);

  // Clock
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('zh-CN', { hour12: false }));
      
      const shanghaiDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Shanghai' }));
      const dIndex = shanghaiDate.getDay();
      const dNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      setCurrentDayName(dNames[dIndex] || '今日');
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/config');
      const data = await res.json();
      if (data.ok && data.config) {
        setJwt(data.config.DUO_JWT_TOKEN || '');
        const sc = data.config.schedule || {};
        setSchedEnabled(sc.enabled !== false);
        setIntervalHours(sc.intervalHours || 5);
        setNormalCheckTime(sc.normalCheckTime || '23:00');
        setNormalPunchTime(sc.normalPunchTime || '23:10');
        setSundayCheckTime(sc.sundayCheckTime || '17:00');
        setSundayPunchTime(sc.sundayPunchTime || '17:10');
        
        const xp = Number(sc.targetXp) || 15;
        setTargetXp(xp);
        if (![15, 30, 50].includes(xp)) {
          setCustomXpMode(true);
        }

        setNotifyOnWarning(sc.notifyOnWarning !== false);
        setNotifyOnSafe(sc.notifyOnAlreadyChecked !== false);

        setFeishuAppId(data.config.FEISHU?.APP_ID || '');
        setFeishuAppSecret(data.config.FEISHU?.APP_SECRET || '');
        setFeishuReceiver(data.config.FEISHU?.RECEIVE_PHONE_OR_EMAIL || '');
        
        if (data.scheduler) {
          setSchedulerInfo(data.scheduler);
        }
      }
    } catch (e) {
      console.error('加载配置失败:', e);
    }
  };

  const fetchUserStatus = async () => {
    setLoadingUser(true);
    try {
      const res = await fetch('/api/duo/check');
      const data = await res.json();
      if (data.ok && data.data) {
        setUser(data.data);
      } else if (data.error) {
        setUser(null);
        showToast(data.error, 'error');
      }
    } catch (e) {
      setUser(null);
      showToast('获取多邻国状态失败: ' + e.message, 'error');
    } finally {
      setLoadingUser(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/history?limit=10');
      const data = await res.json();
      if (data.ok) {
        setHistory(data.history || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadAllData = async () => {
    await Promise.all([fetchConfig(), fetchUserStatus(), fetchHistory()]);
  };

  // Initial load
  useEffect(() => {
    loadAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Immediate Punch
  const handleImmediatePunch = async () => {
    if (punching) return;
    setPunching(true);
    try {
      const res = await fetch('/api/duo/punch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true, targetXp: Number(targetXp) || 15, notify: true })
      });
      const data = await res.json();
      if (data.ok && data.result) {
        if (data.result.action === 'completed') {
          showToast(`打卡成功！斩获 +${data.result.gainedXp} XP，连胜刷新至 ${data.result.newStreak} 天！`, 'success');
        } else {
          showToast(`已跳过：${data.result.reason}`, 'success');
        }
        await fetchUserStatus();
        await fetchHistory();
        await fetchConfig();
      } else {
        showToast(data.error || '打卡遇到问题', 'error');
      }
    } catch (e) {
      showToast('请求失败: ' + e.message, 'error');
    } finally {
      setPunching(false);
    }
  };

  // Save Schedule rules
  const handleSaveSchedule = async () => {
    setSavingConfig(true);
    try {
      const payload = {
        schedule: {
          enabled: schedEnabled,
          intervalHours: Number(intervalHours) || 5,
          normalCheckTime,
          normalPunchTime,
          sundayCheckTime,
          sundayPunchTime,
          targetXp: Number(targetXp) || 15,
          notifyOnWarning,
          notifyOnAlreadyChecked: notifyOnSafe
        }
      };

      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.ok) {
        showToast('打卡与巡检规则已成功保存生效！', 'success');
        if (data.scheduler) setSchedulerInfo(data.scheduler);
      } else {
        showToast('保存失败: ' + data.error, 'error');
      }
    } catch (e) {
      showToast('保存出错: ' + e.message, 'error');
    } finally {
      setSavingConfig(false);
    }
  };

  // Save Feishu config
  const handleSaveFeishu = async () => {
    setSavingConfig(true);
    try {
      const payload = {
        FEISHU: {
          APP_ID: feishuAppId,
          APP_SECRET: feishuAppSecret,
          RECEIVE_PHONE_OR_EMAIL: feishuReceiver
        }
      };
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.ok) {
        showToast('飞书配置已成功保存！', 'success');
      } else {
        showToast('保存失败: ' + data.error, 'error');
      }
    } catch (e) {
      showToast('保存出错: ' + e.message, 'error');
    } finally {
      setSavingConfig(false);
    }
  };

  // Save or Switch JWT Token (Supports any Duolingo account)
  const handleSaveToken = async (newTokenValue) => {
    const valToSave = newTokenValue !== undefined ? newTokenValue : jwt.trim();
    setSavingConfig(true);
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ DUO_JWT_TOKEN: valToSave })
      });
      const data = await res.json();
      if (data.ok) {
        showToast(valToSave ? '多邻国账号 Token 已更新，正在载入账号数据...' : '已清空账号绑定', 'success');
        setShowTokenInput(false);
        await fetchUserStatus();
      } else {
        showToast('保存失败: ' + data.error, 'error');
      }
    } catch (e) {
      showToast('保存出错: ' + e.message, 'error');
    } finally {
      setSavingConfig(false);
    }
  };

  // Test Feishu
  const handleTestFeishu = async () => {
    if (testingFeishu) return;
    setTestingFeishu(true);
    try {
      const res = await fetch('/api/feishu/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appId: feishuAppId,
          appSecret: feishuAppSecret,
          phoneOrEmail: feishuReceiver
        })
      });
      const data = await res.json();
      if (data.ok) {
        showToast('飞书测试卡片已成功送达！请在飞书中查看', 'success');
        await fetchHistory();
      } else {
        showToast('推送失败: ' + (data.error || '请检查 App ID 与 Secret'), 'error');
      }
    } catch (e) {
      showToast('测试出错: ' + e.message, 'error');
    } finally {
      setTestingFeishu(false);
    }
  };

  const isAlreadyPunchedToday = Boolean(user?.hasExtendedToday || schedulerInfo?.isPunchedToday);

  // Theme button label & icon
  const getThemeButtonDisplay = () => {
    if (themeMode === 'light') return { icon: '☀️', label: '浅色模式' };
    if (themeMode === 'dark') return { icon: '🌙', label: '深色模式' };
    return { icon: '💻', label: '跟随系统' };
  };

  const themeDisplay = getThemeButtonDisplay();

  return (
    <div className="container">
      {/* Floating Toast Notification (右上方浮窗提示，完全脱离文档流，不引起页面抖动) */}
      <div className="toast-floating-container">
        {toast && (
          <div className={`toast-bar ${toast.type === 'error' ? 'toast-error' : 'toast-success'}`}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px', fontWeight: '700', color: toast.type === 'error' ? '#ef4444' : '#58cc02' }}>
                {toast.type === 'error' ? '✕' : '✓'}
              </span>
              <span>{toast.message}</span>
            </div>
            <button 
              onClick={() => setToast(null)} 
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '16px', padding: '0 4px', lineHeight: 1 }}
              title="关闭提示"
            >
              ×
            </button>
          </div>
        )}
      </div>


      {/* Top Header */}
      <header className="dashboard-header">
        <div className="header-brand-wrap">
          <h1 className="header-title">
            <span style={{ fontSize: '24px' }}>🦉</span> 多邻国打卡守护
          </h1>
          <p className="header-subtitle">
            每 5 小时自动巡检 · 平日 23:10 自动打卡 · 周日 17:10 自动打卡 · 单日仅打卡一次
          </p>
        </div>

        {/* Right Corner: Time, Status, and Theme Switcher Button */}
        <div className="header-actions">
          <div className="badge badge-muted header-time-badge">
            {currentDayName} {currentTime || '--:--:--'}
          </div>
          <div className="badge badge-green header-status-badge">
            <span className="pulse-dot" />
            自动守护中
          </div>

          {/* Theme switcher button */}
          <button 
            className="btn-theme" 
            onClick={handleCycleTheme} 
            title="点击切换：跟随系统 / 浅色模式 / 深色模式"
          >
            <span className="btn-theme-icon">{themeDisplay.icon}</span>
            <span className="btn-theme-text">{themeDisplay.label}</span>
          </button>
        </div>
      </header>

      {/* Main Two-Column Widescreen Layout */}
      <div className="dashboard-grid">
        {/* LEFT COLUMN: Account & Rules */}
        <div>
          {/* 1. Account & Status Card (Supports switching any account) */}
          <section className="minimal-card">
            <div className="card-header">
              <div>
                <div className="card-title">
                  <span>👤</span>
                  <span>多邻国账号状态</span>
                </div>
                <div className="card-subtitle">
                  自由绑定任何多邻国账号，随时可更换或切换
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  className="btn btn-secondary btn-sm" 
                  onClick={() => setShowTokenInput(!showTokenInput)}
                >
                  {showTokenInput ? '收起配置' : '切换/配置账号'}
                </button>
                <button 
                  className="btn btn-secondary btn-sm" 
                  onClick={fetchUserStatus}
                  disabled={loadingUser || !jwt}
                >
                  {loadingUser ? '正在检测...' : '立即检测'}
                </button>
                <button 
                  className="btn btn-primary btn-sm" 
                  onClick={handleImmediatePunch}
                  disabled={punching || !jwt}
                >
                  {punching ? '正在打卡通关...' : `立即打卡 (+${targetXp}XP)`}
                </button>
              </div>
            </div>

            {/* Editable / Switchable Token Bar (Collapsible or if empty) */}
            {showTokenInput && (
              <div style={{ padding: '14px 16px', background: 'var(--bg-card-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', marginBottom: '16px' }}>
                <label className="input-label" style={{ fontSize: '13px', fontWeight: '600' }}>
                  设置 / 切换多邻国账号 (输入任何账号的 JWT Token)
                </label>
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                  <input 
                    className="input-field" 
                    placeholder="在此粘贴多邻国账号 JWT Token (浏览器 Cookie 中的 jwt_token)" 
                    value={jwt} 
                    onChange={(e) => setJwt(e.target.value)} 
                  />
                  <button className="btn btn-primary btn-sm" onClick={() => handleSaveToken()} disabled={savingConfig}>
                    保存并连接
                  </button>
                  {jwt && (
                    <button 
                      className="btn btn-secondary btn-sm" 
                      onClick={() => { setJwt(''); handleSaveToken(''); }} 
                      disabled={savingConfig}
                    >
                      清空解绑
                    </button>
                  )}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
                  提示：不固定绑定任何账号，你可以随时粘贴任意账号的 JWT Token，系统将自动识别该账号并执行打卡守护。
                </div>
              </div>
            )}

            {/* User Info Bar */}
            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: 'var(--bg-card-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#202b3d', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>
                    {user?.picture ? (
                      <img src={user.picture + '/xlarge'} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      '🦉'
                    )}
                  </div>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '16px' }}>{user.name || '多邻国学员'}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>@{user.username || 'duolingo_user'}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {isAlreadyPunchedToday ? (
                    <span className="badge badge-green" style={{ padding: '6px 14px' }}>
                      ✓ 今日已打卡 · 连胜安全
                    </span>
                  ) : (
                    <span className="badge badge-orange" style={{ padding: '6px 14px' }}>
                      ⏳ 今日尚未打卡 · 守护巡检中
                    </span>
                  )}
                  <span className="badge badge-muted" style={{ fontSize: '12px' }}>
                    🛡️ 单日打卡保障生效中
                  </span>
                </div>
              </div>
            ) : (
              <div style={{ padding: '24px', textAlign: 'center', background: 'var(--bg-card-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>🦉</div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-main)' }}>尚未连接多邻国账号</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', marginBottom: '14px' }}>
                  点击下方按钮填入你的多邻国 JWT Token 即可开启自动巡检打卡
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => setShowTokenInput(true)}>
                  绑定 / 填入多邻国 Token
                </button>
              </div>
            )}

            {/* Check-in Progress Bar Component (今日打卡进度查看) */}
            <div className="progress-card">
              <div className="progress-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>
                    {punching ? '⚡ 正在答题打卡通关中...' : (isAlreadyPunchedToday ? '今日打卡进度：100% 已达成' : '今日打卡进度：待打卡 (0%)')}
                  </span>
                  {isAlreadyPunchedToday ? (
                    <span className="badge badge-green" style={{ fontSize: '11px', padding: '1px 8px' }}>连胜已保住</span>
                  ) : (
                    <span className="badge badge-orange" style={{ fontSize: '11px', padding: '1px 8px' }}>待自动补卡</span>
                  )}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  目标经验：<strong style={{ color: '#58cc02' }}>{targetXp} XP</strong>
                </div>
              </div>
              <div className="progress-track">
                <div 
                  className={`progress-bar-fill ${isAlreadyPunchedToday ? 'active' : ''}`}
                  style={{ 
                    width: punching ? '65%' : (isAlreadyPunchedToday ? '100%' : '0%'),
                    background: punching ? 'linear-gradient(90deg, #ff9600, #58cc02)' : (isAlreadyPunchedToday ? 'linear-gradient(90deg, #58cc02, #46a302)' : 'var(--border-subtle)')
                  }}
                />
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>
                  {isAlreadyPunchedToday 
                    ? `🔥 今日连胜已稳固 (${user?.streak ?? 0} 天)，单日仅打卡 1 次，防重复保护生效中` 
                    : `⏳ 今日尚未完成打卡，系统将在到达时间自动补卡并向飞书推送战报`}
                </span>
                <span style={{ fontWeight: '600', color: isAlreadyPunchedToday ? '#58cc02' : 'var(--text-secondary)' }}>
                  {isAlreadyPunchedToday ? '100%' : (punching ? '作答中...' : '0%')}
                </span>
              </div>
            </div>


            {/* Stats Grid */}
            <div className="stat-grid">
              <div className="stat-box">
                <div className="stat-label">当前连胜天数</div>
                <div className="stat-val" style={{ color: '#ff9600' }}>🔥 {user?.streak ?? '--'} 天</div>
              </div>
              <div className="stat-box">
                <div className="stat-label">总经验值</div>
                <div className="stat-val" style={{ color: '#58cc02' }}>⭐ {user?.totalXp ? user.totalXp.toLocaleString() : '--'} XP</div>
              </div>
              <div className="stat-box">
                <div className="stat-label">打卡经验目标</div>
                <div className="stat-val">🎯 {targetXp} XP</div>
              </div>
              <div className="stat-box">
                <div className="stat-label">今日守护策略</div>
                <div className="stat-val" style={{ fontSize: '13px', lineHeight: '1.4', fontWeight: '500', color: 'var(--text-secondary)' }}>
                  {schedulerInfo?.isSunday ? `周日 17:10 自动打卡` : `平日 23:10 自动打卡`}
                </div>
              </div>
            </div>

            {/* Token Snippet */}
            {jwt && (
              <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
                <span>当前账号 Token：{jwt.substring(0, 16)}...{jwt.slice(-8)}</span>
                <span 
                  style={{ cursor: 'pointer', color: '#58cc02', fontWeight: '500' }} 
                  onClick={() => setShowTokenInput(!showTokenInput)}
                >
                  更换账号
                </span>
              </div>
            )}
          </section>

          {/* 2. Core Scheduling & Check Rules */}
          <section className="minimal-card" style={{ marginBottom: 0 }}>
            <div className="card-header">
              <div>
                <div className="card-title">
                  <span>⏰</span>
                  <span>定时检测与自动打卡规则</span>
                </div>
                <div className="card-subtitle">
                  每隔 5 小时自动巡检；平日 23:10 自动打卡；周日 17:10 自动打卡
                </div>
              </div>
              
              {/* Master Switch */}
              <div className="switch-wrapper" onClick={() => setSchedEnabled(!schedEnabled)}>
                <span style={{ fontSize: '13px', fontWeight: '500', color: schedEnabled ? '#58cc02' : 'var(--text-muted)' }}>
                  {schedEnabled ? '自动打卡已开启' : '自动打卡已暂停'}
                </span>
                <div className={`switch-track ${schedEnabled ? 'active' : ''}`}>
                  <div className="switch-thumb" />
                </div>
              </div>
            </div>

            {/* Rule 1: Routine Interval Patrol */}
            <div style={{ background: 'var(--bg-card-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '16px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🔄</span> 规则一：每日定期检测打卡状态
                </span>
                <span className="badge badge-muted" style={{ fontSize: '11px' }}>全天候巡检</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                <span>每天每隔</span>
                <input 
                  type="number" 
                  min="1" 
                  max="24" 
                  className="input-field" 
                  style={{ width: '80px', padding: '6px 10px', textAlign: 'center' }} 
                  value={intervalHours} 
                  onChange={(e) => setIntervalHours(Math.max(1, Number(e.target.value) || 5))} 
                />
                <span>个小时自动检测一次我是否打卡了</span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
                自动联网查询多邻国服务器，若发现已完成打卡，则更新状态并确保连胜安全。
              </div>
            </div>

            {/* Rule 2: Weekday (Mon-Sat) 23:00 check & 23:10 punch */}
            <div style={{ background: 'var(--bg-card-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '16px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🌙</span> 规则二：平日（周一至周六）晚间兜底打卡
                </span>
                <span className="badge badge-green" style={{ fontSize: '11px' }}>核心防线</span>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label className="input-label">初次预警检测时间</label>
                  <TimeInput 
                    value={normalCheckTime} 
                    onChange={setNormalCheckTime} 
                    placeholder="23:00"
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>默认 23:00（晚上十一点检测是否打卡）</span>
                </div>

                <div>
                  <label className="input-label">超时自动打卡执行时间</label>
                  <TimeInput 
                    value={normalPunchTime} 
                    onChange={setNormalPunchTime} 
                    placeholder="23:10"
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>默认 23:10（隔十分钟若仍未打卡则自动打卡）</span>
                </div>
              </div>
            </div>

            {/* Rule 3: Sunday 17:00 check & 17:10 punch */}
            <div style={{ background: 'var(--bg-card-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '16px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>☀️</span> 规则三：周日专属下午打卡防线
                </span>
                <span className="badge badge-orange" style={{ fontSize: '11px' }}>周日结算前守护</span>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label className="input-label">周日初次检测时间</label>
                  <TimeInput 
                    value={sundayCheckTime} 
                    onChange={setSundayCheckTime} 
                    placeholder="17:00"
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>默认 17:00（下午五点检测是否打卡）</span>
                </div>

                <div>
                  <label className="input-label">周日超时自动打卡时间</label>
                  <TimeInput 
                    value={sundayPunchTime} 
                    onChange={setSundayPunchTime} 
                    placeholder="17:10"
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>默认 17:10（隔十分钟若未打卡则自动打卡）</span>
                </div>
              </div>
            </div>

            {/* Rule 4: Daily Target XP */}
            <div style={{ background: 'var(--bg-card-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '16px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>⭐</span> 规则四：每天自动打卡的经验值 (XP)
                </span>
                <span style={{ fontSize: '12px', color: '#58cc02', fontWeight: '600' }}>
                  当前目标：{targetXp} XP
                </span>
              </div>

              <div className="xp-chips">
                <div 
                  className={`xp-chip ${targetXp === 15 && !customXpMode ? 'active' : ''}`}
                  onClick={() => { setTargetXp(15); setCustomXpMode(false); }}
                >
                  15 XP (日常保底 1 节)
                </div>
                <div 
                  className={`xp-chip ${targetXp === 30 && !customXpMode ? 'active' : ''}`}
                  onClick={() => { setTargetXp(30); setCustomXpMode(false); }}
                >
                  30 XP (稳健提速 2 节)
                </div>
                <div 
                  className={`xp-chip ${targetXp === 50 && !customXpMode ? 'active' : ''}`}
                  onClick={() => { setTargetXp(50); setCustomXpMode(false); }}
                >
                  50 XP (冲榜加练 3~4 节)
                </div>
                <div 
                  className={`xp-chip ${customXpMode ? 'active' : ''}`}
                  onClick={() => setCustomXpMode(true)}
                >
                  自定义经验
                </div>
              </div>

              {customXpMode && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
                  <input 
                    type="number" 
                    min="10" 
                    max="150" 
                    step="5" 
                    className="input-field" 
                    style={{ width: '130px', padding: '6px 10px' }}
                    value={targetXp} 
                    onChange={(e) => setTargetXp(Math.max(10, Number(e.target.value) || 15))} 
                  />
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    经验值 (XP)，触发自动打卡时将模拟答题直至满足该经验要求
                  </span>
                </div>
              )}
            </div>

            {/* Rule 5: Strict Once Per Day Guarantee & Notifications */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', margin: '14px 0 18px', padding: '0 4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px' }}>🔒</span>
                <span style={{ fontSize: '13px', fontWeight: '600', color: '#58cc02' }}>
                  严格遵循防重复打卡原则：一天中只要打卡一次，绝不重复打卡！
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input 
                  type="checkbox" 
                  id="notifyOnWarning" 
                  checked={notifyOnWarning} 
                  onChange={(e) => setNotifyOnWarning(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#58cc02', cursor: 'pointer' }}
                />
                <label htmlFor="notifyOnWarning" style={{ fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  初次检测（23:00 / 17:00）未打卡时，向飞书发送 10 分钟倒计时预警卡片
                </label>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input 
                  type="checkbox" 
                  id="notifyOnSafe" 
                  checked={notifyOnSafe} 
                  onChange={(e) => setNotifyOnSafe(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#58cc02', cursor: 'pointer' }}
                />
                <label htmlFor="notifyOnSafe" style={{ fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  巡检发现今日已完成打卡时，向飞书推送连胜安全卡片
                </label>
              </div>
            </div>

            {/* Save button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                className="btn btn-primary" 
                onClick={handleSaveSchedule}
                disabled={savingConfig}
              >
                {savingConfig ? '正在保存...' : '保存打卡与巡检规则'}
              </button>
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN: Feishu Notifications & Recent Activity Logs (拉长与左侧面板底边同一水平线) */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {/* 3. Feishu Only Notifications */}
          <section className="minimal-card" style={{ flexShrink: 0 }}>
            <div className="card-header">
              <div>
                <div className="card-title">
                  <span>📨</span>
                  <span>飞书消息通知设置</span>
                </div>
                <div className="card-subtitle">
                  打卡与巡检战报仅通过飞书自建应用推送，无需第三方转发
                </div>
              </div>
              <button 
                className="btn btn-secondary btn-sm" 
                onClick={handleTestFeishu}
                disabled={testingFeishu}
              >
                {testingFeishu ? '正在发送测试...' : '测试发送飞书卡片'}
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
              <div className="input-group">
                <label className="input-label">飞书 APP ID</label>
                <input 
                  className="input-field" 
                  placeholder="如 cli_aa22f0a4b1b8dd0c" 
                  value={feishuAppId} 
                  onChange={(e) => setFeishuAppId(e.target.value)} 
                />
              </div>

              <div className="input-group">
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <label className="input-label">飞书 APP SECRET</label>
                  <span 
                    style={{ fontSize: '11px', color: 'var(--text-muted)', cursor: 'pointer' }} 
                    onClick={() => setShowAppSecret(!showAppSecret)}
                  >
                    {showAppSecret ? '隐藏' : '显示'}
                  </span>
                </div>
                <input 
                  type={showAppSecret ? 'text' : 'password'}
                  className="input-field" 
                  placeholder="飞书应用密钥" 
                  value={feishuAppSecret} 
                  onChange={(e) => setFeishuAppSecret(e.target.value)} 
                />
              </div>

            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                💡 战报将自动推送到当前飞书应用管理员，无需填写手机号或邮箱
              </span>
              <button 
                className="btn btn-secondary" 
                onClick={handleSaveFeishu}
                disabled={savingConfig}
              >
                保存飞书配置
              </button>
            </div>
          </section>

          {/* 4. Recent Logs (拉长尺寸，与左侧规则面板底部在同一条水平直线上) */}
          <section className="minimal-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', marginBottom: 0 }}>
            <div className="card-header" style={{ flexShrink: 0 }}>
              <div>
                <div className="card-title">
                  <span>📋</span>
                  <span>今日打卡与检测动态</span>
                </div>
                <div className="card-subtitle">
                  仅记录当天实时动态，跨日自动清除不留存历史
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="badge badge-muted" style={{ fontSize: '11px', padding: '3px 8px' }}>
                  今日限定
                </span>
                <button 
                  className="btn btn-secondary btn-sm" 
                  style={{ fontSize: '11px', padding: '3px 8px' }}
                  onClick={fetchHistory}
                >
                  刷新
                </button>
              </div>
            </div>

            {history.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '36px 0', color: 'var(--text-muted)', fontSize: '13px' }}>
                暂无今日记录，系统将在设定时间自动检测打卡并推送飞书
              </div>
            ) : (
              <div className="activity-log-scroll" style={{ flex: 1, maxHeight: 'none', height: '100%' }}>
                {history.map((item) => (
                  <div 
                    key={item.id || item.timestamp}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '11px 14px',
                      background: 'var(--bg-card-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '13px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      <span style={{ color: item.status === 'ERROR' ? '#ef4444' : (item.status === 'WARNING' ? '#ff9600' : '#58cc02'), fontSize: '14px', flexShrink: 0 }}>
                        {item.status === 'ERROR' ? '✕' : (item.status === 'WARNING' ? '▲' : '●')}
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: '600', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{item.title}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '11px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                          {item.details}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      {item.gainedXp > 0 && (
                        <span style={{ color: '#58cc02', fontWeight: '600', fontSize: '12px' }}>
                          +{item.gainedXp} XP
                        </span>
                      )}
                      {item.streak > 0 && (
                        <span style={{ color: '#ff9600', fontSize: '12px' }}>
                          🔥 {item.streak}天
                        </span>
                      )}
                      {item.feishuSent && (
                        <span className="badge badge-muted" style={{ fontSize: '11px', padding: '2px 6px' }}>
                          飞书已推
                        </span>
                      )}
                      <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontFamily: 'monospace' }}>
                        {item.displayTime?.split(' ')[1] || item.displayTime || ''}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>


      {/* Footer */}
      <footer style={{ textAlign: 'center', marginTop: '32px', color: 'var(--text-muted)', fontSize: '12px' }}>
        多邻国极简打卡守护 · 每 5 小时自动巡检 · 平日 23:10 / 周日 17:10 自动打卡 · 单日仅打卡一次
      </footer>
    </div>
  );
}
