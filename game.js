/* ═══════════════════════════════════════════════════════
   Wet Your Whistle – game.js
   ═══════════════════════════════════════════════════════ */

"use strict";

// ── 상수 ──────────────────────────────────────────────────
const GW = 540, GH = 620;
const PLATE_RX_BASE = 48, PLATE_RY = 10;
const BALL_R = 8;
const BRICK_W = 46, BRICK_H = 18, BRICK_PAD = 4;
const BRICK_COLS = 10;
const BRICK_OX = 7, BRICK_OY = 54;
const PADDLE_Y = GH - 55;
const MAX_RECORDS = 10;

const BRICK_COLORS = [
  ["#FF6B6B","#CC3333"],["#FF9F43","#CC6600"],["#FECA57","#CC9900"],
  ["#48DBFB","#0099CC"],["#FF9FF3","#CC44CC"],["#54A0FF","#1155CC"],
  ["#5F27CD","#3300AA"],["#00D2D3","#007799"],["#1DD1A1","#009966"],
  ["#FF4757","#CC0022"],["#eccc68","#aa8800"],
];

const ITEMS = [
  { emoji:"🍗", label:"치킨", effect:"wide", color:"#FFD700", desc:"접시 넓어짐!", dur:8000 },
  { emoji:"🍗", label:"치킨", effect:"fast", color:"#FF8C00", desc:"공 빨라짐!", dur:6000 },
  { emoji:"🍕", label:"피자", effect:"triball", color:"#FF6347", desc:"공 3개!", dur:10000},
  { emoji:"🥩", label:"고기", effect:"pierce", color:"#C0392B", desc:"관통샷!", dur:7000 },
  { emoji:"🍺", label:"맥주", effect:"x2", color:"#F4D03F", desc:"점수 2배!", dur:8000 },
  { emoji:"🥘", label:"찌개", effect:"slow", color:"#E74C3C", desc:"공 느려짐~", dur:6000 },
  { emoji:"🍜", label:"라면", effect:"longpad", color:"#E67E22", desc:"초대형 접시!", dur:6000 },
];
const SOJU = { emoji:"🍶", label:"소주", effect:"soju", color:"#AAD8FF", desc:"❤️ -1 (소주!)" };

// ── 벽돌 패턴 10종 ────────────────────────────────────────
const BRICK_PATTERNS = [
  // 0: 풀 채우기
  (rows, cols) => Array.from({length:rows}, () => Array(cols).fill(1)),
  // 1: 체커보드
  (rows, cols) => Array.from({length:rows}, (_,r) => Array.from({length:cols}, (_,c) => (r+c)%2===0 ? 1 : 0)),
  // 2: 다이아몬드
  (rows, cols) => Array.from({length:rows}, (_,r) => Array.from({length:cols}, (_,c) => {
    const cr=rows/2, cc=cols/2, dr=Math.abs(r-cr+.5), dc=Math.abs(c-cc+.5);
    return dr/cr + dc/cc < 1 ? 1 : 0;
  })),
  // 3: X자
  (rows, cols) => Array.from({length:rows}, (_,r) => Array.from({length:cols}, (_,c) => {
    const nr=r/(rows-1), nc=c/(cols-1);
    return Math.abs(nr-nc)<.18 || Math.abs(nr-(1-nc))<.18 ? 1 : 0;
  })),
  // 4: 피라미드
  (rows, cols) => Array.from({length:rows}, (_,r) => Array.from({length:cols}, (_,c) => {
    const mid=(cols-1)/2, spread=r*(mid/(rows-1));
    return Math.abs(c-mid) <= spread ? 1 : 0;
  })),
  // 5: 역피라미드
  (rows, cols) => Array.from({length:rows}, (_,r) => Array.from({length:cols}, (_,c) => {
    const mid=(cols-1)/2, spread=(rows-1-r)*(mid/(rows-1));
    return Math.abs(c-mid) <= spread ? 1 : 0;
  })),
  // 6: 액자 (외곽만)
  (rows, cols) => Array.from({length:rows}, (_,r) => Array.from({length:cols}, (_,c) =>
    r===0 || r===rows-1 || c===0 || c===cols-1 ? 1 : 0)),
  // 7: 지그재그
  (rows, cols) => Array.from({length:rows}, (_,r) => Array.from({length:cols}, (_,c) => (c+r*2)%4<2 ? 1 : 0)),
  // 8: 랜덤 군집 (70%)
  (rows, cols) => Array.from({length:rows}, () => Array.from({length:cols}, () => Math.random()<.72 ? 1 : 0)),
  // 9: 가운데 강화(hp2) + 외곽 일반
  (rows, cols) => Array.from({length:rows}, (_,r) => Array.from({length:cols}, (_,c) => {
    const mid=(cols-1)/2, rm=(rows-1)/2;
    return Math.abs(c-mid)<2 && Math.abs(r-rm)<2 ? 2 : 1;
  })),
];

// ── DOM refs ──────────────────────────────────────────────
const titleCanvas = document.getElementById("title-canvas");
const gameCanvas = document.getElementById("game-canvas");
const tCtx = titleCanvas.getContext("2d");
const gCtx = gameCanvas.getContext("2d");

const hudEl = document.getElementById("hud");
const effectBar = document.getElementById("effect-bar");
const hudScore = document.getElementById("hud-score");
const hudLives = document.getElementById("hud-lives");
const hudLevel = document.getElementById("hud-level");
const hudBest = document.getElementById("hud-best");
const toastEl = document.getElementById("toast");

const screenStart = document.getElementById("screen-start");
const screenOver = document.getElementById("screen-over");
const screenRec = document.getElementById("screen-records");

const btnStart = document.getElementById("btn-start");
const btnRecords = document.getElementById("btn-records");
const btnRecClose = document.getElementById("btn-records-close");
const btnRetry = document.getElementById("btn-retry");
const btnToRec = document.getElementById("btn-to-records");
const btnMuteHUD = document.getElementById("btn-mute");
const btnMuteTitle = document.getElementById("btn-mute-title");

const overScore = document.getElementById("over-score");
const overLevel = document.getElementById("over-level");
const overNewRec = document.getElementById("over-new-record");
const titleBest = document.getElementById("title-best");
const titleBestSc = document.getElementById("title-best-score");
const recordsList = document.getElementById("records-list");

// ── 상태 ──────────────────────────────────────────────────
let state = null; // 게임 상태 객체
let screen = "start"; // "start" | "game" | "over"
let muted = false;
let animId = null;
let titleAnimId = null;
let frame = 0;
let toastTimer = null;

// ── 우주 배경 데이터 ──────────────────────────────────────
const stars = Array.from({length:120}, () => ({
  x: Math.random(), y: Math.random(),
  r: Math.random()*1.8+.3,
  speed: Math.random()*.0004+.0001,
  twinkle: Math.random()*Math.PI*2,
  color: Math.random()<.2 ? "#FFD700" : Math.random()<.3 ? "#AAD8FF" : "#fff",
}));
const nebula = Array.from({length:6}, () => ({
  x: Math.random(), y: Math.random(),
  rx: Math.random()*.3+.15, ry: Math.random()*.15+.08,
  color: `hsla(${Math.floor(Math.random()*360)},70%,60%,`,
  rot: Math.random()*Math.PI,
}));
const ship = { x:.5, y:.8, vx:.0008, vy:-.0003, trail:[] };

// ── 점수 저장 ─────────────────────────────────────────────
function loadRecords() {
  try { return JSON.parse(localStorage.getItem("wyw_records") || "[]"); }
  catch(e) { return []; }
}
function saveRecord(score, level) {
  const list = loadRecords();
  list.push({ score, level, date: new Date().toLocaleDateString("ko-KR") });
  list.sort((a,b) => b.score - a.score);
  const trimmed = list.slice(0, MAX_RECORDS);
  try { localStorage.setItem("wyw_records", JSON.stringify(trimmed)); } catch(e) {}
  return trimmed;
}
function getBest() {
  const r = loadRecords();
  return r.length > 0 ? r[0].score : 0;
}

// ── Audio ──────────────────────────────────────────────────
let _ac = null;
function getAC() {
  if (!_ac) _ac = new (window.AudioContext || window.webkitAudioContext)();
  if (_ac.state === "suspended") _ac.resume();
  return _ac;
}
function beep(freq, dur, type="square", vol=0.12) {
  if (muted) return;
  try {
    const ac=getAC(), o=ac.createOscillator(), g=ac.createGain();
    o.connect(g); g.connect(ac.destination);
    o.type=type; o.frequency.value=freq;
    g.gain.setValueAtTime(vol, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime+dur);
    o.start(); o.stop(ac.currentTime+dur);
  } catch(e) {}
}
const sfxBrick = () => beep(280,.06,"square",.10);
const sfxPad = () => beep(460,.05,"sine",.09);
const sfxItem = () => { beep(640,.10,"sine",.16); setTimeout(()=>beep(860,.09,"sine",.13),75); };
const sfxSoju = () => beep(180,.20,"sawtooth",.14);
const sfxDead = () => [290,240,190,140].forEach((f,i)=>setTimeout(()=>beep(f,.09,"sawtooth",.13),i*65));
const sfxLevel = () => [523,659,784,1047].forEach((f,i)=>setTimeout(()=>beep(f,.11,"sine",.16),i*75));

// ── BGM (싱글 인스턴스) ────────────────────────────────────
let bgmId = 0, bgmActive = false;
function stopBGM() { bgmId++; bgmActive = false; }
function startBGM() {
  stopBGM();
  if (muted) return;
  bgmActive = true;
  const myId = bgmId;
  const ac = getAC();
  const BPM=138, beat=60/BPM;
  const melody=[
    [659,1],[784,.5],[659,.5],[587,1],[523,1],[587,.5],[659,.5],[784,1],[880,1],
    [784,.5],[659,.5],[587,1],[523,1],[440,.5],[523,.5],[587,1],[659,2],
    [659,1],[784,.5],[659,.5],[587,1],[523,1],[587,.5],[659,.5],[784,1],[880,1],
    [784,1],[880,.5],[784,.5],[659,1],[587,.5],[523,.5],[440,1],[523,2],
  ];
  const bassP=[[196,1],[246,.5],[196,.5],[220,1],[196,.5],[165,.5]];

  function mel(st) {
    if (bgmId!==myId||!bgmActive) return;
    const ac2=getAC(); let t=st;
    const o=ac2.createOscillator(), g=ac2.createGain();
    const vl=ac2.createOscillator(), vg=ac2.createGain();
    vl.frequency.value=5.5; vg.gain.value=4;
    vl.connect(vg); vg.connect(o.frequency);
    o.type="triangle"; o.connect(g); g.gain.value=0; g.connect(ac2.destination);
    vl.start(st); o.start(st);
    let tot=0;
    melody.forEach(([fr,dr]) => {
      const nd=dr*beat;
      o.frequency.setValueAtTime(fr,t);
      g.gain.setValueAtTime(.12,t); g.gain.setValueAtTime(.12,t+nd*.75);
      g.gain.linearRampToValueAtTime(.01,t+nd*.95);
      t+=nd; tot+=nd;
    });
    o.stop(t+.05); vl.stop(t+.05);
    setTimeout(()=>mel(ac2.currentTime+.05),(tot-.12)*1000);
  }
  function bass(st) {
    if (bgmId!==myId||!bgmActive) return;
    const ac2=getAC(); let t=st;
    const o=ac2.createOscillator(), g=ac2.createGain();
    o.type="sawtooth"; o.connect(g); g.gain.value=0; g.connect(ac2.destination); o.start(st);
    let tot=0;
    for(let rep=0;rep<4;rep++) bassP.forEach(([fr,dr]) => {
      const nd=dr*beat;
      o.frequency.setValueAtTime(fr,t);
      g.gain.setValueAtTime(.06,t); g.gain.setValueAtTime(.06,t+nd*.6);
      g.gain.linearRampToValueAtTime(.001,t+nd*.85);
      t+=nd; tot+=nd;
    });
    o.stop(t+.05);
    setTimeout(()=>bass(ac2.currentTime+.05),(tot-.12)*1000);
  }
  function drum(st, bars=8) {
    if (bgmId!==myId||!bgmActive) return;
    const ac2=getAC(); let t=st;
    for(let b=0;b<bars*4;b++) {
      if(b%2===0) {
        const buf=ac2.createBuffer(1,ac2.sampleRate*.15,ac2.sampleRate);
        const d=buf.getChannelData(0);
        for(let i=0;i<d.length;i++){const dc=Math.exp(-i/(ac2.sampleRate*.05));const f=60*Math.exp(-i/(ac2.sampleRate*.02));d[i]=Math.sin(2*Math.PI*f*i/ac2.sampleRate)*dc*.5;}
        const src=ac2.createBufferSource(), gk=ac2.createGain();
        src.buffer=buf; src.connect(gk); gk.connect(ac2.destination); gk.gain.value=.55; src.start(t);
      }
      if(b%2===1) {
        const buf=ac2.createBuffer(1,ac2.sampleRate*.12,ac2.sampleRate);
        const d=buf.getChannelData(0);
        for(let i=0;i<d.length;i++) d[i]=(Math.random()*2-1)*Math.exp(-i/(ac2.sampleRate*.04))*.3;
        const src=ac2.createBufferSource(), gs=ac2.createGain();
        src.buffer=buf; src.connect(gs); gs.connect(ac2.destination); gs.gain.value=.45; src.start(t);
      }
      t+=beat*.5;
    }
    const tot=bars*4*beat*.5;
    setTimeout(()=>drum(ac2.currentTime+.05,bars),(tot-.12)*1000);
  }
  const now=ac.currentTime+.1;
  mel(now); bass(now); drum(now);
}

// ── 진동 ──────────────────────────────────────────────────
function vibrate(p) { try { if(navigator.vibrate) navigator.vibrate(p); } catch(e) {} }

// ── 게임 헬퍼 ─────────────────────────────────────────────
function getPlateRX(eff) { return eff.longpad ? 72 : eff.wide ? 58 : PLATE_RX_BASE; }
function getBaseSpd(score, lv) { return 3.0 + lv*.18 + Math.min(score/2200,1.0)*1.4; }
function getSpd(eff, score, lv) {
  const b = getBaseSpd(score, lv);
  return eff.fast ? b*1.45 : eff.slow ? b*.58 : b;
}

function makeBricks(level) {
  const rows = Math.min(2+(level-1), 8);
  const patIdx = Math.floor(Math.random()*BRICK_PATTERNS.length);
  const mask = BRICK_PATTERNS[patIdx](rows, BRICK_COLS);
  const arr = [];
  mask.forEach((row, r) => row.forEach((cell, c) => {
    if (!cell) return;
    const hp = cell===2 ? 2 : (level>=4 && Math.random()<.2) ? 2 : 1;
    const ci = Math.floor(Math.random()*BRICK_COLORS.length);
    arr.push({
      x: BRICK_OX + c*(BRICK_W+BRICK_PAD),
      y: BRICK_OY + r*(BRICK_H+BRICK_PAD),
      w: BRICK_W, h: BRICK_H,
      hp, maxHp: hp,
      color: BRICK_COLORS[ci][0], dark: BRICK_COLORS[ci][1],
      alive: true,
    });
  }));
  return arr;
}

function makeBall(eff, score, lv, x, y, vx, vy) {
  const spd = getSpd(eff, score, lv);
  const angle = -Math.PI/2 + (Math.random()-.5)*.45;
  return {
    x: x ?? GW/2, y: y ?? (PADDLE_Y - PLATE_RY - BALL_R - 2),
    vx: vx ?? Math.cos(angle)*spd,
    vy: vy ?? Math.sin(angle)*spd,
    launched: false, r: BALL_R,
  };
}

function spawnParticles(s, x, y, color, n=10) {
  for(let i=0;i<n;i++){
    const a=Math.random()*Math.PI*2, sp=1.5+Math.random()*4;
    s.particles.push({x,y, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp, life:1, color, r:2+Math.random()*4});
  }
}

function rectBall(rx,ry,rw,rh,bx,by,br) {
  const cx=Math.max(rx,Math.min(bx,rx+rw)), cy=Math.max(ry,Math.min(by,ry+rh));
  return (bx-cx)**2+(by-cy)**2 <= br*br;
}

// ── UI 헬퍼 ───────────────────────────────────────────────
function showToast(text, color="#fff") {
  toastEl.textContent = text;
  toastEl.style.color = color;
  toastEl.classList.add("show");
  toastEl.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.classList.remove("show");
  }, 1500);
}

function updateHUD() {
  if (!state) return;
  hudScore.textContent = `SCORE: ${state.score.toLocaleString()}`;
  hudLives.textContent = Array.from({length:3},(_,i)=>i<state.lives?"❤️":"🖤").join("");
  hudLevel.textContent = `LV.${state.level}`;
  const best = getBest();
  hudBest.textContent = best > 0 ? `🏆${best.toLocaleString()}` : "";

  const active = [];
  if(state.eff.wide) active.push("접시 넓음");
  if(state.eff.longpad) active.push("초대형 접시");
  if(state.eff.fast) active.push("⚡빠름");
  if(state.eff.slow) active.push("🐢느림");
  if(state.eff.pierce) active.push("💥관통");
  if(state.eff.triball) active.push("🎱3볼");
  if(state.eff.x2) active.push("⭐2배");

  effectBar.textContent = active.join(" · ");
  effectBar.classList.toggle("hidden", active.length===0);
}

function renderRecordsList() {
  const list = loadRecords();
  if (list.length === 0) {
    recordsList.innerHTML = `<p class="no-records">아직 기록이 없어요</p>`;
    return;
  }
  const medals = ["🥇","🥈","🥉"];
  let html = `<div class="records-header"><span>#</span><span>점수</span><span>레벨</span><span>날짜</span></div>`;
  list.forEach((r,i) => {
    html += `
      <div class="record-row${i===0?" top1":""}">
        <span class="record-rank" style="color:${i===0?"#FFD700":i===1?"#C0C0C0":i===2?"#CD7F32":"#444"}">${i<3?medals[i]:i+1}</span>
        <span class="record-score${i===0?" gold":""}">${r.score.toLocaleString()}</span>
        <span class="record-level">Lv.${r.level}</span>
        <span class="record-date">${r.date}</span>
      </div>`;
  });
  recordsList.innerHTML = html;
}

function updateTitleBest() {
  const best = getBest();
  if (best > 0) {
    titleBestSc.textContent = best.toLocaleString();
    titleBest.classList.remove("hidden");
  } else {
    titleBest.classList.add("hidden");
  }
}

// ── 화면 전환 ─────────────────────────────────────────────
function showScreen(name) {
  screen = name;
  screenStart.classList.toggle("hidden", name !== "start");
  screenOver.classList.toggle("hidden", name !== "over");
  screenRec.classList.toggle("hidden", name !== "records");
  hudEl.classList.toggle("hidden", name !== "game");
  effectBar.classList.toggle("hidden", name !== "game");
  titleCanvas.classList.toggle("hidden", name !== "start");
  gameCanvas.classList.toggle("hidden", name === "start");

  if (name === "start") {
    updateTitleBest();
    startTitleAnim();
  } else {
    stopTitleAnim();
  }
}

// ── 이펙트 적용 ───────────────────────────────────────────
function applyEffect(item) {
  const s = state;
  sfxItem(); vibrate([20,10,20]);

  if (item.effect === "soju") {
    s.lives = Math.max(0, s.lives-1);
    showToast("🍶 소주야 왜 나와...", "#AAD8FF");
    spawnParticles(s, GW/2, GH/2, "#AAD8FF", 18);
    sfxSoju(); vibrate([80,30,80,30,80]);
    if (s.lives <= 0) {
      s.running = false; stopBGM();
      const updated = saveRecord(s.score, s.level);
      endGame(s.score, s.level, updated);
    }
    return;
  }

  const e = item.effect;
  if(e==="wide" && s.eff.longpad){s.eff.longpad=false;clearTimeout(s.effTimers.longpad);}
  if(e==="longpad" && s.eff.wide) {s.eff.wide=false; clearTimeout(s.effTimers.wide);}
  s.eff[e] = true;
  showToast(item.emoji+" "+item.desc, item.color);
  spawnParticles(s, GW/2, GH-80, item.color, 15);
  clearTimeout(s.effTimers[e]);
  s.effTimers[e] = setTimeout(()=>{ s.eff[e]=false; }, item.dur);

  if(e==="triball" && s.balls.length===1) {
    const b=s.balls[0];
    if(b.launched){
      s.balls.push(makeBall(s.eff,s.score,s.level,b.x,b.y,-b.vy,b.vx));
      s.balls.push(makeBall(s.eff,s.score,s.level,b.x,b.y, b.vy,-b.vx));
    }
  }
  if(e==="fast"||e==="slow") {
    const spd=getSpd(s.eff,s.score,s.level);
    s.balls.forEach(b=>{
      if(!b.launched) return;
      const c=Math.hypot(b.vx,b.vy);
      if(c>0){b.vx=b.vx/c*spd;b.vy=b.vy/c*spd;}
    });
  }
}

function endGame(score, level, records) {
  overScore.textContent = score.toLocaleString();
  overLevel.textContent = `Lv.${level} 도달`;
  overNewRec.classList.toggle("hidden", !(records.length>0 && records[0].score===score && score>0));
  showScreen("over");
}

// ── 게임 초기화 ───────────────────────────────────────────
function initGame(lv=1) {
  const eff = {wide:false,fast:false,triball:false,pierce:false,x2:false,slow:false,longpad:false};
  state = {
    paddle: { cx: GW/2, y: PADDLE_Y },
    balls: [makeBall(eff,0,lv)],
    bricks: makeBricks(lv),
    items: [], particles: [],
    score: 0, lives: 3, level: lv,
    eff, effTimers: {}, running: true,
  };
  updateHUD();
  showScreen("game");
}

// ── 마우스/터치 ───────────────────────────────────────────
let pointerX = GW/2;

function updatePointer(clientX) {
  const rect = gameCanvas.getBoundingClientRect();
  pointerX = (clientX - rect.left) * (GW / rect.width);
}

gameCanvas.addEventListener("mousemove", e => updatePointer(e.clientX));
gameCanvas.addEventListener("touchmove", e => {
  e.preventDefault();
  updatePointer(e.touches[0].clientX);
}, { passive: false });
gameCanvas.addEventListener("click", () => {
  if (!state || !state.running) return;
  state.balls.forEach(b => { if(!b.launched){ b.launched=true; beep(520,.08,"sine",.11); } });
});
gameCanvas.addEventListener("touchstart", e => {
  if (!state || !state.running) return;
  updatePointer(e.touches[0].clientX);
  state.balls.forEach(b => { if(!b.launched){ b.launched=true; beep(520,.08,"sine",.11); } });
}, { passive: false });

// ── 뮤트 토글 ─────────────────────────────────────────────
function toggleMute() {
  muted = !muted;
  const icon = muted ? "🔇" : "🔊";
  btnMuteHUD.textContent = icon;
  btnMuteTitle.textContent = icon;
  if (muted) stopBGM();
  else if (state?.running) startBGM();
}
btnMuteHUD.addEventListener("click", toggleMute);
btnMuteTitle.addEventListener("click", toggleMute);

// ── 버튼 이벤트 ───────────────────────────────────────────
btnStart.addEventListener("click", () => {
  try { getAC(); } catch(e) {}
  if (animId) cancelAnimationFrame(animId);
  startBGM();
  initGame(1);
  animId = requestAnimationFrame(gameLoop);
});

btnRecords.addEventListener("click", () => {
  renderRecordsList();
  showScreen("records");
});
btnRecClose.addEventListener("click", () => showScreen("start"));

btnRetry.addEventListener("click", () => {
  if (animId) cancelAnimationFrame(animId);
  startBGM();
  initGame(1);
  animId = requestAnimationFrame(gameLoop);
});
btnToRec.addEventListener("click", () => {
  renderRecordsList();
  showScreen("records");
  // records 화면에서 닫으면 start로
  btnRecClose.onclick = () => showScreen("start");
});

// ── 접시 패들 그리기 ──────────────────────────────────────
function drawPlate(ctx, cx, py, rx, ry, eff) {
  const c1 = eff.longpad?"#7FFFAA" : eff.wide?"#FFE082" : "#E0E8FF";
  const c2 = eff.longpad?"#00C870" : eff.wide?"#FF8C00" : "#7090CC";

  // 손잡이 (아래)
  const hw=14, hh=22;
  const hg = ctx.createLinearGradient(cx-hw/2,py+ry,cx+hw/2,py+ry+hh);
  hg.addColorStop(0, c2);
  hg.addColorStop(1,"rgba(0,0,0,0.4)");
  ctx.fillStyle = hg;
  ctx.beginPath();
  ctx.roundRect(cx-hw/2, py+ry-2, hw, hh+2, 4);
  ctx.fill();
  ctx.strokeStyle="rgba(255,255,255,0.2)"; ctx.lineWidth=1;
  ctx.beginPath(); ctx.roundRect(cx-hw/2, py+ry-2, hw, hh+2, 4); ctx.stroke();

  // 접시 그림자
  ctx.save();
  ctx.shadowColor = eff.longpad?"rgba(127,255,170,0.7)":eff.wide?"rgba(255,200,0,0.6)":"rgba(80,140,255,0.5)";
  ctx.shadowBlur = 20;

  // 접시 몸통
  const pg = ctx.createRadialGradient(cx, py-ry*.3, ry*.1, cx, py, rx);
  pg.addColorStop(0,"rgba(255,255,255,0.9)");
  pg.addColorStop(.35, c1);
  pg.addColorStop(1, c2);
  ctx.beginPath(); ctx.ellipse(cx, py, rx, ry, 0, 0, Math.PI*2);
  ctx.fillStyle = pg; ctx.fill();

  // 테두리
  ctx.strokeStyle="rgba(255,255,255,0.6)"; ctx.lineWidth=2;
  ctx.beginPath(); ctx.ellipse(cx, py, rx, ry, 0, 0, Math.PI*2); ctx.stroke();

  // 안쪽 홈
  ctx.strokeStyle="rgba(0,0,0,0.1)"; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.ellipse(cx, py, rx*.68, ry*.62, 0, 0, Math.PI*2); ctx.stroke();

  // 하이라이트
  ctx.fillStyle="rgba(255,255,255,0.55)";
  ctx.beginPath(); ctx.ellipse(cx-rx*.22, py-ry*.28, rx*.28, ry*.25, -.3, 0, Math.PI*2); ctx.fill();

  ctx.restore();
}

// ── 카툰 아이템 그리기 ────────────────────────────────────
function drawCartoonItem(ctx, item, x, y, size, t) {
  const s = size*(.9+Math.sin(t*.09+x)*.1);
  ctx.save(); ctx.translate(x,y);
  ctx.beginPath(); ctx.ellipse(0,s*.46,s*.38,s*.10,0,0,Math.PI*2);
  ctx.fillStyle="rgba(0,0,0,0.25)"; ctx.fill();
  ctx.beginPath(); ctx.arc(0,0,s*.54,0,Math.PI*2);
  const bg=ctx.createRadialGradient(-s*.14,-s*.14,s*.02,0,0,s*.54);
  bg.addColorStop(0,"rgba(255,255,255,0.38)"); bg.addColorStop(1,"rgba(0,0,0,0.28)");
  ctx.fillStyle=bg; ctx.fill();
  ctx.strokeStyle="rgba(255,255,255,0.6)"; ctx.lineWidth=2.2; ctx.stroke();
  ctx.font=`${s*.92}px serif`; ctx.textAlign="center"; ctx.textBaseline="middle";
  ctx.fillText(item.emoji, 0, s*.06);
  ctx.font=`bold ${s*.28}px sans-serif`;
  ctx.strokeStyle="rgba(0,0,0,0.75)"; ctx.lineWidth=3.5;
  ctx.strokeText(item.label, 0, s*.74);
  ctx.fillStyle="#fff"; ctx.fillText(item.label, 0, s*.74);
  ctx.restore();
}

// ── 타이틀 우주 루프 ──────────────────────────────────────
function startTitleAnim() {
  stopTitleAnim();
  (function loop() {
    titleAnimId = requestAnimationFrame(loop);
    const t = frame++ * .016;
    const W=GW, H=GH;

    tCtx.fillStyle="#02020e"; tCtx.fillRect(0,0,W,H);

    // 성운
    nebula.forEach(n=>{
      tCtx.save(); tCtx.translate(n.x*W,n.y*H); tCtx.rotate(n.rot+t*.02);
      const g=tCtx.createRadialGradient(0,0,0,0,0,n.rx*W);
      g.addColorStop(0,n.color+"0.12)"); g.addColorStop(.5,n.color+"0.05)"); g.addColorStop(1,"transparent");
      tCtx.fillStyle=g; tCtx.beginPath(); tCtx.ellipse(0,0,n.rx*W,n.ry*H,0,0,Math.PI*2); tCtx.fill();
      tCtx.restore();
    });

    // 별
    stars.forEach(s=>{
      s.y -= s.speed; if(s.y<0) s.y=1;
      const tw=Math.sin(t*2+s.twinkle)*.4+.6;
      tCtx.globalAlpha=tw; tCtx.fillStyle=s.color;
      tCtx.beginPath(); tCtx.arc(s.x*W,s.y*H,s.r,0,Math.PI*2); tCtx.fill();
    });
    tCtx.globalAlpha=1;

    // 유성
    if(Math.random()<.008){
      const mx=Math.random()*W,mlen=80+Math.random()*60;
      tCtx.strokeStyle="rgba(255,255,255,0.7)"; tCtx.lineWidth=1.5;
      tCtx.beginPath(); tCtx.moveTo(mx,0); tCtx.lineTo(mx-mlen*.6,mlen); tCtx.stroke();
    }

    // 행성
    [[.15,.22,22,"#FF9F43",.4],[.82,.35,14,"#AAD8FF",.3],[.6,.7,18,"#5F27CD",.25]].forEach(([px,py,pr,pc,pa])=>{
      tCtx.globalAlpha=pa; tCtx.fillStyle=pc;
      tCtx.beginPath(); tCtx.arc(px*W,py*H,pr,0,Math.PI*2); tCtx.fill();
      tCtx.strokeStyle=pc; tCtx.lineWidth=2; tCtx.globalAlpha=pa*.5;
      tCtx.beginPath(); tCtx.ellipse(px*W,py*H,pr*1.6,pr*.45,.4,0,Math.PI*2); tCtx.stroke();
    });
    tCtx.globalAlpha=1;

    // 우주선
    ship.x+=ship.vx; ship.y+=ship.vy;
    if(ship.x<.1||ship.x>.9){ship.vx*=-1; ship.vx+=(Math.random()-.5)*.0003;}
    if(ship.y<.1||ship.y>.9){ship.vy*=-1; ship.vy+=(Math.random()-.5)*.0003;}
    if(Math.random()<.01){ship.vx+=(Math.random()-.5)*.0002; ship.vy+=(Math.random()-.5)*.0002;}
    ship.trail.push({x:ship.x*W,y:ship.y*H});
    if(ship.trail.length>28) ship.trail.shift();
    ship.trail.forEach((p,i)=>{
      tCtx.globalAlpha=(i/ship.trail.length)*.5;
      tCtx.fillStyle="#60C8FF";
      tCtx.beginPath(); tCtx.arc(p.x,p.y,(i/ship.trail.length)*3,0,Math.PI*2); tCtx.fill();
    });
    tCtx.globalAlpha=1;
    tCtx.save(); tCtx.translate(ship.x*W,ship.y*H);
    tCtx.rotate(Math.atan2(ship.vy,ship.vx)+Math.PI/2);
    tCtx.font="22px serif"; tCtx.textAlign="center"; tCtx.textBaseline="middle";
    tCtx.fillText("🚀",0,0);
    tCtx.restore();
  })();
}
function stopTitleAnim() {
  if (titleAnimId) { cancelAnimationFrame(titleAnimId); titleAnimId=null; }
}

// ── 메인 게임 루프 ────────────────────────────────────────
function gameLoop() {
  const s = state;
  if (!s || !s.running) return;
  frame++;
  const t = frame;
  const rx = getPlateRX(s.eff);

  // 패들
  s.paddle.cx = Math.max(rx, Math.min(GW-rx, pointerX));

  // 공 업데이트
  s.balls = s.balls.filter(b => {
    if (!b.launched) {
      b.x = s.paddle.cx;
      b.y = PADDLE_Y - PLATE_RY - b.r - 2;
      return true;
    }
    // 속도 서서히 조정
    const ts=getSpd(s.eff,s.score,s.level), cs=Math.hypot(b.vx,b.vy);
    if(cs>0 && Math.abs(cs-ts)>.25){ const f=1+(ts-cs)*.006; b.vx*=f; b.vy*=f; }
    b.x+=b.vx; b.y+=b.vy;
    if(b.x-b.r<0){b.x=b.r;b.vx*=-1;sfxPad();}
    if(b.x+b.r>GW){b.x=GW-b.r;b.vx*=-1;sfxPad();}
    if(b.y-b.r<0){b.y=b.r;b.vy*=-1;sfxPad();}
    if(b.y>GH+30) return false;

    // 접시 충돌 (타원)
    const dx=b.x-s.paddle.cx, dy=b.y-PADDLE_Y;
    if(b.vy>0 && (dx*dx)/(rx*rx)+(dy*dy)/(PLATE_RY*PLATE_RY)<=1.4) {
      const hit=dx/rx, sp=Math.hypot(b.vx,b.vy);
      b.vx=Math.sin(hit*1.1)*sp;
      b.vy=-Math.abs(Math.cos(hit*1.1)*sp);
      b.y=PADDLE_Y-PLATE_RY-b.r;
      sfxPad(); vibrate(10);
    }

    // 벽돌 충돌
    for(const br of s.bricks) {
      if(!br.alive) continue;
      if(!rectBall(br.x,br.y,br.w,br.h,b.x,b.y,b.r)) continue;
      br.hp--;
      if(br.hp<=0){
        br.alive=false;
        spawnParticles(s,br.x+br.w/2,br.y+br.h/2,br.color,14);
        if(Math.random()<.14){
          const isSoju=Math.random()<.16;
          const tpl=isSoju?SOJU:ITEMS[Math.floor(Math.random()*ITEMS.length)];
          s.items.push({...tpl, x:br.x+br.w/2, y:br.y+br.h/2, vy:2.2});
        }
        s.score += (s.eff.x2?20:10)*s.level;
        sfxBrick(); vibrate(8);
      } else {
        sfxBrick();
      }
      if(!s.eff.pierce){
        const oL=(b.x+b.r)-br.x, oR=(br.x+br.w)-(b.x-b.r);
        const oT=(b.y+b.r)-br.y, oB=(br.y+br.h)-(b.y-b.r);
        if(Math.min(oL,oR)<Math.min(oT,oB)) b.vx*=-1; else b.vy*=-1;
      }
      break;
    }
    return true;
  });

  // 공 전부 소멸
  if(s.balls.length===0){
    s.lives--;
    sfxDead(); vibrate([60,30,60,30,120]);
    if(s.lives<=0){
      s.running=false; stopBGM();
      const updated=saveRecord(s.score,s.level);
      endGame(s.score,s.level,updated);
      return;
    }
    s.balls=[makeBall(s.eff,s.score,s.level)];
    showToast("💔 앗!","#FF4444");
  }

  // 낙하 아이템
  s.items = s.items.filter(item => {
    item.y += item.vy||2.2;
    if(item.y>GH) return false;
    const dx=item.x-s.paddle.cx, dy=item.y-PADDLE_Y;
    if((dx*dx)/((rx+20)*(rx+20))+(dy*dy)/((PLATE_RY+20)*(PLATE_RY+20))<=1){
      applyEffect(item); return false;
    }
    return true;
  });

  // 파티클
  s.particles.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=.1;p.life-=.022;p.vx*=.97;});
  s.particles = s.particles.filter(p=>p.life>0);

  // 레벨 클리어
  if(s.bricks.every(b=>!b.alive)){
    s.level++;
    sfxLevel(); vibrate([30,20,30,20,60]);
    showToast(`🎉 LEVEL ${s.level}!`,"#FFD700");
    spawnParticles(s,GW/2,GH/2,"#FFD700",50);
    s.bricks=makeBricks(s.level);
    s.balls=[makeBall(s.eff,s.score,s.level)];
  }

  updateHUD();

  // ── DRAW ────────────────────────────────────────────────
  gCtx.fillStyle="#0a0a18"; gCtx.fillRect(0,0,GW,GH);

  // 배경 별
  gCtx.fillStyle="rgba(255,255,255,0.5)";
  for(let i=0;i<40;i++){
    const sx=(i*137+t*.3)%GW, sy=(i*91+t*.15)%GH;
    gCtx.beginPath(); gCtx.arc(sx,sy,.8,0,Math.PI*2); gCtx.fill();
  }

  // 벽돌
  s.bricks.forEach(b=>{
    if(!b.alive) return;
    const g=gCtx.createLinearGradient(b.x,b.y,b.x,b.y+b.h);
    g.addColorStop(0,b.color); g.addColorStop(1,b.dark);
    gCtx.fillStyle=g;
    gCtx.beginPath(); gCtx.roundRect(b.x+1,b.y+1,b.w-2,b.h-2,4); gCtx.fill();
    gCtx.strokeStyle="rgba(255,255,255,0.25)"; gCtx.lineWidth=1;
    gCtx.beginPath(); gCtx.roundRect(b.x+1,b.y+1,b.w-2,b.h-2,4); gCtx.stroke();
    gCtx.fillStyle="rgba(255,255,255,0.15)";
    gCtx.beginPath(); gCtx.roundRect(b.x+3,b.y+3,b.w-6,4,2); gCtx.fill();
    if(b.hp<b.maxHp){
      gCtx.strokeStyle="rgba(0,0,0,0.65)"; gCtx.lineWidth=2;
      gCtx.beginPath();
      gCtx.moveTo(b.x+b.w*.22,b.y+2); gCtx.lineTo(b.x+b.w*.42,b.y+b.h*.6);
      gCtx.lineTo(b.x+b.w*.62,b.y+b.h*.3); gCtx.lineTo(b.x+b.w*.82,b.y+b.h-2);
      gCtx.stroke();
    }
  });

  // 아이템
  s.items.forEach(item=>drawCartoonItem(gCtx,item,item.x,item.y,42,t));

  // 파티클
  s.particles.forEach(p=>{
    gCtx.globalAlpha=p.life; gCtx.fillStyle=p.color;
    gCtx.beginPath(); gCtx.arc(p.x,p.y,p.r*p.life,0,Math.PI*2); gCtx.fill();
  });
  gCtx.globalAlpha=1;

  // 공
  s.balls.forEach(b=>{
    // 광택 후광
    const tg=gCtx.createRadialGradient(b.x,b.y,0,b.x,b.y,b.r*2.5);
    tg.addColorStop(0,"rgba(255,220,80,0.25)"); tg.addColorStop(1,"transparent");
    gCtx.fillStyle=tg; gCtx.beginPath(); gCtx.arc(b.x,b.y,b.r*2.5,0,Math.PI*2); gCtx.fill();
    // 본체
    const bg=gCtx.createRadialGradient(b.x-b.r*.35,b.y-b.r*.35,b.r*.1,b.x,b.y,b.r);
    bg.addColorStop(0,"#fff"); bg.addColorStop(.35,"#FFE066"); bg.addColorStop(1,"#FF8C00");
    gCtx.shadowColor="#FFD700"; gCtx.shadowBlur=16;
    gCtx.fillStyle=bg; gCtx.beginPath(); gCtx.arc(b.x,b.y,b.r,0,Math.PI*2); gCtx.fill();
    gCtx.shadowBlur=0;
    // 하이라이트
    gCtx.fillStyle="rgba(255,255,255,0.65)";
    gCtx.beginPath(); gCtx.ellipse(b.x-b.r*.3,b.y-b.r*.3,b.r*.28,b.r*.17,-.5,0,Math.PI*2); gCtx.fill();
    // 출발 안내
    if(!b.launched){
      gCtx.font="bold 12px sans-serif";
      gCtx.textAlign="center"; gCtx.textBaseline="middle";
      gCtx.strokeStyle="rgba(0,0,0,0.65)"; gCtx.lineWidth=3;
      gCtx.strokeText("탭하여 출발",b.x,b.y-28);
      gCtx.fillStyle="rgba(255,255,255,0.9)";
      gCtx.fillText("탭하여 출발",b.x,b.y-28);
    }
  });

  // 접시 패들
  drawPlate(gCtx, s.paddle.cx, PADDLE_Y, rx, PLATE_RY, s.eff);

  // 속도 게이지
  const spdR=Math.min(s.score/2200,1);
  gCtx.fillStyle="rgba(255,255,255,0.08)";
  gCtx.beginPath(); gCtx.roundRect(GW-74,GH-18,64,7,3); gCtx.fill();
  const gc=gCtx.createLinearGradient(GW-74,0,GW-10,0);
  gc.addColorStop(0,"#48DBFB"); gc.addColorStop(1,"#FF6B6B");
  gCtx.fillStyle=gc;
  gCtx.beginPath(); gCtx.roundRect(GW-74,GH-18,64*spdR,7,3); gCtx.fill();
  gCtx.fillStyle="rgba(255,255,255,0.38)";
  gCtx.font="9px sans-serif"; gCtx.textAlign="right"; gCtx.textBaseline="middle";
  gCtx.fillText("SPEED",GW-76,GH-14);

  animId = requestAnimationFrame(gameLoop);
}

// ── 초기 화면 ─────────────────────────────────────────────
showScreen("start");
