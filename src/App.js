// App.js ーー JS版（TypeScript記法なし・UIライブラリ不使用）
import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Sparkles, Check, Plus, Upload, Download, Bell, Undo2, Trash2 } from "lucide-react";
import "./styles.css";

// ---- helpers ----
const todayKey = () => new Date().toISOString().slice(0, 10);
const uid = () => Math.random().toString(36).slice(2, 10);

function loadLogs() {
  try {
    const raw = localStorage.getItem("ur-boost-logs");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
function saveLogs(logs) {
  localStorage.setItem("ur-boost-logs", JSON.stringify(logs));
}
function formatJP(dateStr) {
  const d = new Date(dateStr);
  const wd = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
  return `${d.getMonth() + 1}月${d.getDate()}日（${wd}）`;
}
function sumPoints(entries) {
  return entries.reduce((a, e) => a + (Number.isFinite(e.points) ? e.points : 0), 0);
}
function rankFromScore(score) {
  if (score >= 400) return { code: "UR", color: "grad-ur" };
  if (score >= 250) return { code: "SSR", color: "grad-ssr" };
  if (score >= 150) return { code: "SR", color: "grad-sr" };
  if (score >= 80) return { code: "R", color: "grad-r" };
  return { code: "N", color: "grad-n" };
}
const PRESETS = [
  { name: "起きた / 体を起こした", points: 60, hint: "布団バフ解除" },
  { name: "ご飯を食べた", points: 50, hint: "燃料補給" },
  { name: "PCを開いた", points: 70, hint: "準備フェーズ" },
  { name: "3分だけ作業", points: 90, hint: "スモールスタート" },
  { name: "正直に本音を言えた", points: 120, hint: "本音クリティカル" },
  { name: "ちゃんと休憩できた", points: 80, hint: "回復行動も加点" },
  { name: "人に助けを求めた/相談した", points: 130, hint: "勇気スキル" }
];
function randomPraise(rank, score) {
  const base = [
    "よっ！チャンピオン！",
    "今日の君、完全に主人公！",
    "SSR級の誠実さ、見た！",
    "URオーラ出てる！",
    "その一歩、世界線を動かしたね。"
  ];
  const extras = {
    UR: ["歴代最強更新！", "神話に刻まれる勢い！"],
    SSR: ["伝説クラス！", "拍手が止まらん！"],
    SR: ["流れ来てる！", "調子いいぞ！"],
    R: ["良い立ち上がり！", "確実に前進！"],
    N: ["まずは火を点けた！", "ここからだ！"]
  };
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  return `${pick(base)} ${pick(extras[rank])}（${score}pt）`;
}
function calcStreak(logs) {
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 3650; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const exist = logs[key] && logs[key].entries.length > 0;
    if (i === 0 && !exist) break;
    if (exist) streak++;
    else break;
  }
  return streak;
}

export default function URSelfBoost() {
  const [logs, setLogs] = useState(() => loadLogs());
  const [dateKey, setDateKey] = useState(todayKey());
  const dlog = logs[dateKey] ?? { date: dateKey, entries: [] };
  const score = useMemo(() => sumPoints(dlog.entries), [dlog.entries]);
  const rank = rankFromScore(score);
  const [praise, setPraise] = useState("");
  const [customName, setCustomName] = useState("");
  const [customPts, setCustomPts] = useState(100);
  const fileRef = useRef(null);

  useEffect(() => saveLogs(logs), [logs]);
  useEffect(() => setPraise(randomPraise(rank.code, score)), [score, rank.code]);

  const addEntry = (name, points) => {
    const entry = { id: uid(), name, points, ts: Date.now() };
    setLogs((prev) => {
      const cur = prev[dateKey] ?? { date: dateKey, entries: [] };
      return { ...prev, [dateKey]: { ...cur, entries: [entry, ...cur.entries] } };
    });
  };
  const undoLast = () => {
    setLogs((prev) => {
      const cur = prev[dateKey];
      if (!cur || cur.entries.length === 0) return prev;
      return { ...prev, [dateKey]: { ...cur, entries: cur.entries.slice(1) } };
    });
  };
  const removeEntry = (id) => {
    setLogs((prev) => {
      const cur = prev[dateKey];
      if (!cur) return prev;
      return { ...prev, [dateKey]: { ...cur, entries: cur.entries.filter((e) => e.id !== id) } };
    });
  };
  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ur-self-boost-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const importJSON = (f) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        setLogs(parsed);
      } catch (e) {
        alert("JSON を読み込めませんでした");
      }
    };
    reader.readAsText(f);
  };
  const notify = async () => {
    try {
      if (!("Notification" in window)) return alert("通知に未対応の環境です");
      if (Notification.permission !== "granted") {
        await Notification.requestPermission();
      }
      if (Notification.permission === "granted") {
        new Notification("UR Self-Boost", { body: "今日のSSR行動を1つだけ追加してみよう！" });
      }
    } catch {}
  };
  const streak = useMemo(() => calcStreak(logs), [logs]);
  const dateKeys = useMemo(() => Object.keys(logs).sort().reverse(), [logs]);

  return (
    <div className="wrap">
      {/* header */}
      <div className="row space">
        <div className="row gap">
          <motion.div initial={{ rotate: -8, scale: 0.9 }} animate={{ rotate: 0, scale: 1 }} className={`badge ${rank.color}`}>
            <Trophy size={22} />
          </motion.div>
          <div>
            <h1 className="ttl">UR Self-Boost</h1>
            <div className="sub">自己肯定感ブースター / 見える褒めログ</div>
          </div>
        </div>
        <div className="row gap">
          <button className="btn ghost" onClick={exportJSON}><Download size={16}/>エクスポート</button>
          <input ref={fileRef} type="file" accept="application/json" className="hide"
                 onChange={(e)=>{ const f=e.target.files?.[0]; if(f) importJSON(f); }} />
          <button className="btn ghost" onClick={()=>fileRef.current?.click()}><Upload size={16}/>インポート</button>
          <button className="btn" onClick={notify}><Bell size={16}/>通知</button>
        </div>
      </div>

      {/* today */}
      <div className="card">
        <div className="row space">
          <div className="card-ttl">今日：{formatJP(dateKey)}</div>
          <div className="row gap">
            <div className="muted">連続日数：<b>{streak}</b> 日</div>
            <span className={`pill ${rank.color}`}>{rank.code}</span>
            <div className="score">{score}<span className="pt">pt</span></div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={praise} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                      className="praise row gap">
            <Sparkles size={18}/> {praise}
          </motion.div>
        </AnimatePresence>

        {/* presets */}
        <div className="grid">
          {PRESETS.map((p) => (
            <button key={p.name} className="btn block" onClick={()=>addEntry(p.name, p.points)}>
              <div className="btxt">{p.name}</div>
              <div className="muted xs">+{p.points}pt ・ {p.hint || ""}</div>
            </button>
          ))}
        </div>

        {/* custom */}
        <div className="row custom">
          <input className="input" value={customName} onChange={(e)=>setCustomName(e.target.value)} placeholder="カスタム行動（例：UIスケッチ1枚）"/>
          <input className="input w120" type="number" value={customPts} onChange={(e)=>setCustomPts(parseInt(e.target.value || "0", 10))}/>
          <button className="btn" onClick={()=>{ if(!customName) return; addEntry(customName, Number.isFinite(customPts)?customPts:0); setCustomName(""); }}>
            <Plus size={16}/>追加
          </button>
        </div>

        {/* actions */}
        <div className="row gap">
          <button className="btn ghost" onClick={undoLast}><Undo2 size={16}/>一つ戻す</button>
          <button className="btn danger" onClick={()=>setLogs((prev)=>({ ...prev, [dateKey]: { date: dateKey, entries: [] } }))}>
            <Trash2 size={16}/>今日をクリア
          </button>
        </div>

        {/* list */}
        <div className="list">
          {dlog.entries.length === 0 && <div className="muted">まだ記録がありません。上のボタンから “SSR行動” を1つ追加してみよう。</div>}
          <ul className="ul">
            {dlog.entries.map((e)=>(
              <li key={e.id} className="li row space">
                <div className="row gap">
                  <Check size={16} className="muted"/>
                  <div>
                    <div className="btxt">{e.name}</div>
                    <div className="muted xs">+{e.points}pt ・ {new Date(e.ts).toLocaleTimeString([], {hour: "2-digit", minute:"2-digit"})}</div>
                  </div>
                </div>
                <button className="btn ghost" onClick={()=>removeEntry(e.id)}>削除</button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* history */}
      <div className="card">
        <div className="card-ttl">履歴</div>
        <div className="hist">
          {dateKeys.map((dk)=>{
            const log = logs[dk];
            const s = sumPoints(log.entries);
            const r = rankFromScore(s);
            return (
              <button key={dk} className="hist-item" onClick={()=>setDateKey(dk)}>
                <div className="row space">
                  <div className="muted b">{formatJP(dk)}</div>
                  <span className={`pill xs ${r.color}`}>{r.code}</span>
                </div>
                <div className="score small">{s}<span className="pt">pt</span></div>
                <div className="muted xs ellipsis">{log.entries.map(x=>x.name).join("、") || "記録なし"}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* notes */}
      <div className="card">
        <div className="card-ttl">使い方のヒント</div>
        <ul className="notes">
          <li>ポイントは「普通＝50点」を基準に、気持ちよく盛ってOK。あなたはUR候補です。</li>
          <li>休む・助けを求めるなどの回復行動も加点対象。生き延びることは強さ。</li>
          <li>毎日1つで十分。連続日数（Streak）を伸ばすと自己肯定感の土台が育つよ。</li>
          <li>エクスポート/インポートでバックアップ可能。通知ボタンで軽いリマインドも。</li>
        </ul>
    </div>
    </div>
  );
}
