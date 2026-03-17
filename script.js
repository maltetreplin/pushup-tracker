
// ==== Einstellungen ====
const TOTAL_GOAL = 10000;
const TARGET_DATE = new Date('2026-06-14');
const MILESTONE_BADGES = [100, 500, 1000, 2500, 5000, 7500, 10000];
const STREAK_BADGES = [1, 3, 7, 14, 30];

// ==== State ====
let total = Number(localStorage.getItem('pushups')||0);
let history = JSON.parse(localStorage.getItem('history')||"{}");
let dailyGoal = Number(localStorage.getItem('dailyGoal')||111);
let themePref = localStorage.getItem('theme')||'auto';

// ==== Elements ====
let dailyGoalInput, dailyStatusEl, totalEl, barEl, remainingEl, chartEl, weekChartEl;
let installBtn, exportBtn, themeBtn, badgesBtn, backupBtn, restoreBtn, restoreInput, miniBadges;
let weekSumEl, forecastEl, recommendEl;
let badgeModal, badgeGrid, closeModalBtn;

// ==== Helpers ====
const fmt = n => new Intl.NumberFormat('de-DE').format(n);
const todayStr = () => new Date().toISOString().slice(0,10);
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate()+n); return x; };
const dateStr = d => d.toISOString().slice(0,10);

function save(){
  localStorage.setItem('pushups', total);
  localStorage.setItem('history', JSON.stringify(history));
  localStorage.setItem('dailyGoal', dailyGoal);
  localStorage.setItem('theme', themePref);
}

function getSortedDates(){ return Object.keys(history).sort(); }

function currentStreak(){
  let d = new Date(); d.setHours(0,0,0,0);
  let streak = 0;
  while (true) {
    const s = dateStr(d);
    if ((Number(history[s])||0) > 0) { streak++; d = addDays(d, -1); }
    else break;
  }
  return streak;
}

function earnedBadges(){
  const earned = { milestones: [], streaks: [] };
  for (const m of MILESTONE_BADGES) { if (total >= m) earned.milestones.push(m); }
  const s = currentStreak();
  for (const t of STREAK_BADGES) { if (s >= t) earned.streaks.push(t); }
  return {earned, streak:s};
}

function updateMiniBadges(){
  const {earned} = earnedBadges();
  const ms = earned.milestones.map(m=>`\uD83C\uDFC6${m}`);
  const ss = earned.streaks.map(t=>`\uD83D\uDD25${t}`);
  const merged = ms.concat(ss).slice(-3);
  miniBadges.innerHTML = merged.map(b=>`<span class=\"mini\">${b}</span>`).join('');
}

// ==== Charts (Canvas) ====
function movingAverage(arr, w=7){ const out=[]; for(let i=0;i<arr.length;i++){ const s=Math.max(0,i-w+1), e=i+1; const slice=arr.slice(s,e); out.push(slice.reduce((a,b)=>a+b,0)/slice.length); } return out; }

function drawMainChart(){
  const labels = getSortedDates();
  const data = labels.map(k=> Number(history[k])||0 ); // cast to numbers
  const avg = movingAverage(data, 7);
  const canvas = chartEl; const ctx = canvas.getContext('2d');
  const W = canvas.width = canvas.clientWidth; const H = canvas.height;
  ctx.clearRect(0,0,W,H);
  const styles = getComputedStyle(document.documentElement);
  const gridColor = (styles.getPropertyValue('--grid')||'#eee').trim();
  const textColor = (styles.getPropertyValue('--muted')||'#666').trim();
  const lineDaily = '#1976d2';
  const lineAvg = '#ff9800';
  const padL = 40, padR = 14, padT = 12, padB = 26;
  const maxY = Math.max(10, ...data, 10), minY = 0;
  const n = data.length;
  const x = i => padL + (W - padL - padR) * (n<=1?0.5:(i/(n-1)));
  const y = v => H - padB - (H - padT - padB) * ((v-minY)/(maxY-minY||1));
  // grid
  ctx.strokeStyle = gridColor; ctx.lineWidth = 1;
  for(let g=0; g<=4; g++){ const gy = padT + (H-padT-padB)*g/4; ctx.beginPath(); ctx.moveTo(padL, gy); ctx.lineTo(W-padR, gy); ctx.stroke(); }
  // axes
  ctx.strokeStyle = textColor; ctx.beginPath(); ctx.moveTo(padL, padT); ctx.lineTo(padL, H-padB); ctx.lineTo(W-padR, H-padB); ctx.stroke();
  // y labels (top -> bottom)
  ctx.fillStyle = textColor; ctx.font = '12px system-ui, -apple-system'; ctx.textAlign='right'; ctx.textBaseline='middle';
  for (let g = 0; g <= 4; g++) {
    const frac = g / 4; const val = Math.round(maxY - (maxY - minY) * frac); const gy = padT + (H - padT - padB) * frac; ctx.fillText(String(val), padL - 6, gy);
  }
  // x labels
  ctx.textAlign='center'; ctx.textBaseline='top';
  labels.forEach((lab,i)=>{ if(n<=12 || i%Math.ceil(n/12)==0){ ctx.fillText(lab.slice(5), x(i), H-padB+6); } });
  
  function drawPoint(px, py, color){ ctx.fillStyle=color; ctx.beginPath(); ctx.arc(px, py, 3.5, 0, Math.PI*2); ctx.fill(); }
  function drawLine(arr, color, fill=false){
    if(n===0) return;
    ctx.strokeStyle=color; ctx.lineWidth=2; ctx.beginPath();
    ctx.moveTo(x(0), y(arr[0]||0));
    for(let i=1;i<n;i++){ ctx.lineTo(x(i), y(arr[i]||0)); }
    // Wenn nur 1 Punkt vorhanden, zusätzlich Punkt zeichnen
    if(n===1){ ctx.stroke(); drawPoint(x(0), y(arr[0]||0), color); return; }
    ctx.stroke();
    if(fill){ ctx.fillStyle=color+'26'; ctx.lineTo(x(n-1), H-padB); ctx.lineTo(x(0), H-padB); ctx.closePath(); ctx.fill(); }
  }
  drawLine(data, lineDaily, true);
  drawLine(avg, lineAvg, false);
}

function weekBounds(d){
  const day=(d.getDay()+6)%7; // Mon=0..Sun=6
  const start = new Date(d); start.setDate(d.getDate()-day); start.setHours(0,0,0,0);
  const end = addDays(start, 6); end.setHours(23,59,59,999);
  return {start, end};
}

function drawWeekChartAndStats(){
  const today = new Date(); today.setHours(0,0,0,0);
  const {start} = weekBounds(today);
  const labels = []; const data = [];
  for(let i=0;i<7;i++){ const d = addDays(start, i); const s = dateStr(d); labels.push(s); data.push(Number(history[s])||0); }
  const canvas = weekChartEl; const ctx = canvas.getContext('2d');
  const W = canvas.width = canvas.clientWidth; const H = canvas.height;
  ctx.clearRect(0,0,W,H);
  const styles = getComputedStyle(document.documentElement);
  const gridColor = (styles.getPropertyValue('--grid')||'#eee').trim();
  const textColor = (styles.getPropertyValue('--muted')||'#666').trim();
  const lineDaily = '#1976d2';
  const padL = 36, padR = 10, padT = 8, padB = 22;
  const maxY = Math.max(10, ...data, 10), minY = 0;
  const n = data.length;
  const x = i => padL + (W - padL - padR) * (n<=1?0.5:(i/(n-1)));
  const y = v => H - padB - (H - padT - padB) * ((v-minY)/(maxY-minY||1));
  // grid & axes
  ctx.strokeStyle = gridColor; ctx.lineWidth=1; for(let g=0; g<=3; g++){ const gy=padT+(H-padT-padB)*g/3; ctx.beginPath(); ctx.moveTo(padL,gy); ctx.lineTo(W-padR,gy); ctx.stroke(); }
  ctx.strokeStyle = textColor; ctx.beginPath(); ctx.moveTo(padL, padT); ctx.lineTo(padL, H-padB); ctx.lineTo(W-padR, H-padB); ctx.stroke();
  // y labels (top -> bottom)
  ctx.fillStyle=textColor; ctx.font='12px system-ui,-apple-system'; ctx.textAlign='right'; ctx.textBaseline='middle';
  for (let g = 0; g <= 3; g++) { const frac = g/3; const val = Math.round(maxY - (maxY - minY) * frac); const gy = padT + (H - padT - padB) * frac; ctx.fillText(String(val), padL - 6, gy); }
  // x labels
  ctx.textAlign='center'; ctx.textBaseline='top'; const wd=['Mo','Di','Mi','Do','Fr','Sa','So']; labels.forEach((_,i)=>{ ctx.fillText(wd[i], x(i), H-padB+4); });
  // line + point fallback
  function drawPoint(px, py, color){ ctx.fillStyle=color; ctx.beginPath(); ctx.arc(px, py, 3.5, 0, Math.PI*2); ctx.fill(); }
  ctx.strokeStyle=lineDaily; ctx.lineWidth=2; ctx.beginPath();
  ctx.moveTo(x(0), y(data[0]||0));
  for(let i=1;i<n;i++){ ctx.lineTo(x(i), y(data[i]||0)); }
  if(n===1){ ctx.stroke(); drawPoint(x(0), y(data[0]||0), lineDaily); }
  else {
    ctx.stroke(); ctx.fillStyle = lineDaily+'26'; ctx.lineTo(x(n-1), H-padB); ctx.lineTo(x(0), H-padB); ctx.closePath(); ctx.fill();
  }

  // stats
  const weekSum = data.reduce((a,b)=>a+b,0);
  weekSumEl.textContent = fmt(weekSum);

  // Forecast
  const now = new Date(); now.setHours(0,0,0,0);
  const remainingToGoal = Math.max(0, TOTAL_GOAL - total);
  const daysLeft = Math.ceil((TARGET_DATE - now)/(1000*60*60*24));
  let forecastText;
  if(daysLeft <= 0){
    forecastText = remainingToGoal===0 ? 'Ziel erreicht' : `Ziel verpasst (Rest ${fmt(remainingToGoal)})`;
  } else {
    const neededPerDay = Math.ceil(remainingToGoal / daysLeft);
    forecastText = remainingToGoal===0 ? 'Ziel erreicht' : `${fmt(neededPerDay)}/Tag nötig`;
  }
  forecastEl.textContent = forecastText;

  // Recommendation for tomorrow
  const needed = daysLeft>0 ? Math.ceil(remainingToGoal / daysLeft) : 0;
  const todayNeeded = Math.max(0, needed);
  recommendEl.textContent = needed>0 ? `${fmt(todayNeeded)}+` : 'Locker weiter!';
}

// ==== UI & Interactions ====
function updateUI(){
  totalEl.textContent = fmt(total);
  const pct = Math.min(100, Math.round(total/TOTAL_GOAL*100));
  barEl.style.width = pct+"%";
  remainingEl.textContent = fmt(Math.max(0, TOTAL_GOAL-total));
  const d = todayStr();
  const todayCount = Number(history[d])||0;
  const diff = dailyGoal - todayCount;
  dailyStatusEl.textContent = diff>0 ? `${fmt(diff)} heute noch` : `Ziel erreicht (+${fmt(Math.abs(diff))})`;
  dailyStatusEl.style.color = diff>0 ? '#cc0000' : '#1b5e20';
  drawMainChart();
  drawWeekChartAndStats();
  updateMiniBadges();
  renderBadgesModal();
}

function add(n){
  const d = todayStr();
  total += n;
  history[d] = (Number(history[d])||0) + n; // ensure numeric accumulation
  save();
  updateUI();
}

function resetAll(){
  if(!confirm('Alles zurücksetzen?')) return;
  total = 0; history = {}; save(); updateUI();
}

// === CSV Export ===
function exportCSV(){
  const lines = ['Datum;Liegestuetze'];
  for(const k of getSortedDates()){ lines.push(`${k};${Number(history[k])||0}`); }
  const blob = new Blob([lines.join('\n')], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download='pushups_history.csv'; a.click(); URL.revokeObjectURL(url);
}

// === Backup / Restore (.pushups) ===
function makeBackup(){
  const payload = { total, history, dailyGoal, theme: themePref, awards: earnedBadges() };
  const blob = new Blob([JSON.stringify(payload)], {type:'application/json'});
  const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='pushups.backup'; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href), 5000);
}
async function restoreBackup(file){
  try{
    const text = await file.text();
    const data = JSON.parse(text);
    if(!data || typeof data!=='object') throw new Error('Ungültige Datei');
    if(data.total!=null) total = Number(data.total)||0;
    if(data.history) history = data.history;
    if(data.dailyGoal!=null) dailyGoal = Number(data.dailyGoal)||111;
    if(data.theme) themePref = data.theme;
    save(); updateUI(); alert('Backup wiederhergestellt.');
  }catch(e){ alert('Wiederherstellung fehlgeschlagen: '+e.message); }
}

// === Theme ===
function setTheme(mode){ themePref=mode; save(); document.documentElement.setAttribute('data-theme', mode==='auto' ? 'auto' : mode); themeBtn.textContent = mode==='dark' ? '☀️' : '🌙'; }
function toggleTheme(){ const cur = themePref; const next = cur==='dark' ? 'light' : cur==='light' ? 'auto' : 'dark'; setTheme(next); }

// === Badges UI ===
function badgeDef(){
  const defs = [];
  for(const m of MILESTONE_BADGES){ defs.push({id:'M'+m, type:'milestone', value:m, icon:'\uD83C\uDFC6', title:`${m} Gesamt`, desc:`Erreiche insgesamt ${m} Liegestütze.`}); }
  for(const s of STREAK_BADGES){ defs.push({id:'S'+s, type:'streak', value:s, icon:'\uD83D\uDD25', title:`${s}-Tage-Streak`, desc:`An ${s} Tagen in Folge Liegestütze.`}); }
  return defs;
}
function renderBadgesModal(){
  const {earned} = earnedBadges();
  if(!badgeGrid) return;
  const defs = badgeDef();
  badgeGrid.innerHTML = defs.map(b=>(
      `<div class=\"badge ${ (b.type==='milestone'? (earned.milestones.includes(b.value)) : (earned.streaks.includes(b.value)) ) ? '' : 'locked' }\">\n`+
      `  <div class=\"icon\">${b.icon}</div>\n`+
      `  <div class=\"meta\">\n`+
      `    <div class=\"title\">${b.title}</div>\n`+
      `    <div class=\"desc\">${b.desc}</div>\n`+
      `  </div>\n`+
      `</div>`
  )).join('');
}

// ==== Init ====
function init(){
  // elements
  totalEl = document.getElementById('total');
  barEl = document.getElementById('bar');
  remainingEl = document.getElementById('remaining');
  chartEl = document.getElementById('chart');
  weekChartEl = document.getElementById('weekChart');
  dailyGoalInput = document.getElementById('dailyGoal');
  dailyStatusEl = document.getElementById('dailyStatus');
  installBtn = document.getElementById('installBtn');
  exportBtn = document.getElementById('exportBtn');
  themeBtn = document.getElementById('themeBtn');
  badgesBtn = document.getElementById('badgesBtn');
  backupBtn = document.getElementById('backupBtn');
  restoreBtn = document.getElementById('restoreBtn');
  restoreInput = document.getElementById('restoreInput');
  miniBadges = document.getElementById('miniBadges');
  weekSumEl = document.getElementById('weekSum');
  forecastEl = document.getElementById('forecast');
  recommendEl = document.getElementById('recommend');
  badgeModal = document.getElementById('badgeModal');
  badgeGrid = document.getElementById('badgeGrid');
  closeModalBtn = document.getElementById('closeModal');

  // listeners
  document.querySelectorAll('[data-add]').forEach(btn=> btn.addEventListener('click', ()=> add(Number(btn.dataset.add))));
  document.getElementById('resetBtn').addEventListener('click', resetAll);
  exportBtn.addEventListener('click', exportCSV);
  backupBtn.addEventListener('click', makeBackup);
  restoreBtn.addEventListener('click', ()=> restoreInput.click());
  restoreInput.addEventListener('change', (e)=>{ const f = e.target.files[0]; if(f) restoreBackup(f); e.target.value=''; });
  themeBtn.addEventListener('click', toggleTheme);
  badgesBtn.addEventListener('click', ()=>{ badgeModal.hidden=false; });
  closeModalBtn.addEventListener('click', ()=>{ badgeModal.hidden=true; });
  badgeModal.addEventListener('click', (e)=>{ if(e.target===badgeModal) badgeModal.hidden=true; });

  // theme init
  setTheme(themePref);

  // first render
  dailyGoalInput.value = dailyGoal;
  dailyGoalInput.addEventListener('change', ()=>{ dailyGoal = Math.max(1, Number(dailyGoalInput.value)||111); save(); updateUI(); });

  updateUI();
}

// Install prompt (Chrome/Edge)
let deferredPrompt; window.addEventListener('beforeinstallprompt', (e)=>{ e.preventDefault(); deferredPrompt=e; installBtn.hidden=false; installBtn.addEventListener('click', async ()=>{ installBtn.hidden=true; await deferredPrompt.prompt(); deferredPrompt=null; }); });

window.addEventListener('load', init);
