
// State
const TOTAL_GOAL = 10000;
let total = Number(localStorage.getItem('pushups')||0);
let history = JSON.parse(localStorage.getItem('history')||"{}");
let dailyGoalInput, dailyStatusEl, totalEl, barEl, remainingEl, chartEl, installBtn;
let dailyGoal = Number(localStorage.getItem('dailyGoal')||111);
let chart;

function today(){ return new Date().toISOString().slice(0,10); }

function save(){
  localStorage.setItem('pushups', total);
  localStorage.setItem('history', JSON.stringify(history));
  localStorage.setItem('dailyGoal', dailyGoal);
}

function updateUI(){
  totalEl.textContent = total;
  const pct = Math.min(100, Math.round(total/TOTAL_GOAL*100));
  barEl.style.width = pct+"%";
  remainingEl.textContent = Math.max(0, TOTAL_GOAL-total);
  // daily goal status
  const d = today();
  const todayCount = history[d]||0;
  const diff = dailyGoal - todayCount;
  dailyStatusEl.textContent = diff>0 ? `${diff} heute noch` : `Ziel erreicht (+${Math.abs(diff)})`;
  dailyStatusEl.style.color = diff>0 ? '#cc0000' : '#1b5e20';
  drawChart();
}

function add(n){
  total += n;
  const d = today();
  history[d] = (history[d]||0) + n;
  save();
  updateUI();
}

function reset(){
  if(!confirm('Alles zurücksetzen?')) return;
  total = 0; history = {}; save(); updateUI();
}

function drawChart(){
  const labels = Object.keys(history).sort();
  const data = labels.map(k=>history[k]);
  const ctx = chartEl.getContext('2d');
  if(window.Chart===undefined){ console.warn('Chart.js nicht geladen'); return; }
  if(chart) chart.destroy();
  chart = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets:[{ label:'Liegestütze pro Tag', data, borderColor:'#1976d2', backgroundColor:'rgba(25,118,210,.15)', tension:.2, fill:true }] },
    options: { scales: { y: { beginAtZero: true } }, plugins:{ legend:{ display:false } } }
  });
}

function init(){
  totalEl = document.getElementById('total');
  barEl = document.getElementById('bar');
  remainingEl = document.getElementById('remaining');
  chartEl = document.getElementById('chart');
  dailyGoalInput = document.getElementById('dailyGoal');
  dailyStatusEl = document.getElementById('dailyStatus');
  installBtn = document.getElementById('installBtn');

  document.querySelectorAll('[data-add]').forEach(btn=> btn.addEventListener('click', ()=> add(Number(btn.dataset.add))));
  document.getElementById('resetBtn').addEventListener('click', reset);
  dailyGoalInput.value = dailyGoal;
  dailyGoalInput.addEventListener('change', ()=>{ dailyGoal = Math.max(1, Number(dailyGoalInput.value)||111); save(); updateUI(); });

  updateUI();
}

let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e)=>{
  e.preventDefault();
  deferredPrompt = e;
  installBtn.hidden = false;
  installBtn.addEventListener('click', async ()=>{
    installBtn.hidden = true;
    await deferredPrompt.prompt();
    deferredPrompt = null;
  });
});

window.addEventListener('load', init);
