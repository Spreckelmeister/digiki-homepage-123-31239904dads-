export function initZahlenStrasse(root){
  "use strict";
  let destroyed=false;
  const offs=[];
  const on=(t,e,f,o)=>{ t.addEventListener(e,f,o); offs.push(()=>t.removeEventListener(e,f,o)); };

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- Geometrie-Helfer (Design-Koordinaten, Box 100 x 150) ----------
  function line(x1,y1,x2,y2){
    const pts=[]; const n=Math.max(2,Math.round(Math.hypot(x2-x1,y2-y1)/2.2));
    for(let i=0;i<=n;i++){const t=i/n; pts.push([x1+(x2-x1)*t, y1+(y2-y1)*t]);}
    return pts;
  }
  function arc(cx,cy,rx,ry,a0,a1){ // Grad; y zeigt nach unten
    const pts=[]; const span=Math.abs(a1-a0); const n=Math.max(8,Math.round(span/4));
    for(let i=0;i<=n;i++){const t=i/n; const a=(a0+(a1-a0)*t)*Math.PI/180;
      pts.push([cx+rx*Math.cos(a), cy+ry*Math.sin(a)]);}
    return pts;
  }
  function cat(){ // mehrere Segmente zu einem Strich verbinden
    let out=[];
    for(const seg of arguments){
      for(const p of seg){
        if(out.length){const l=out[out.length-1]; if(Math.hypot(l[0]-p[0],l[1]-p[1])<0.3) continue;}
        out.push(p);
      }
    }
    return out;
  }
  function shift(strokes,dx){ return strokes.map(s=>s.map(p=>[p[0]+dx,p[1]])); }

  // ---------- Ziffern als Striche (Schreibrichtung wie Grundschule) ----------
  function fig8(cx,cy,A,B){            // Acht in einem Zug (oben starten, links herum)
    const pts=[]; const N=180;
    for(let i=0;i<=N;i++){ const t=2*Math.PI*i/N;
      pts.push([cx - A*Math.sin(2*t), cy - B*Math.cos(t)]); }
    return pts;
  }
  function baseStrokes(d){
    switch(d){
      // Null: oben starten, gegen den Uhrzeigersinn (nach links)
      case '0': return [ arc(50,75,22,50,-90,-450) ];
      // Eins: schräg nach oben, gerade runter (ohne Fußstrich)
      case '1': return [ cat(line(38,40,53,25), line(53,25,53,125)) ];
      case '2': { const top=arc(50,48,21,23,165,375); const e=top[top.length-1];
                  return [ cat(top, line(e[0],e[1],30,125), line(30,125,74,125)) ]; }
      // Drei: oben links starten, zwei Bäuche
      case '3': return [ cat(arc(50,47,20,22,-150,90), arc(50,95,21,24,-90,120)) ];
      case '4': return [ cat(line(60,25,28,92), line(28,92,76,92)), line(60,25,60,127) ];
      // Fünf: Strich runter + Bauch, dann der Hut zuletzt
      case '5': { const belly=arc(50,90,21,24,-128,120);
                  return [ cat(line(35,27,35,66), belly), line(35,27,68,27) ]; }
      // Sechs: oben starten, Bogen nach links unten, Bauch gegen den Uhrzeigersinn
      case '6': { const desc=arc(52,70,24,45,-60,-230); const e=desc[desc.length-1];
                  const cx=52,cy=103,rx=18,ry=22;
                  const a0=Math.atan2(e[1]-cy,e[0]-cx)*180/Math.PI;
                  return [ cat(desc, arc(cx,cy,rx,ry,a0,a0-360)) ]; }
      // Sieben: Dach + Schräge, dann Mittelstrich
      case '7': return [ cat(line(28,28,74,28), line(74,28,44,127)), line(46,80,68,80) ];
      // Acht: ein durchgehender Zug
      case '8': return [ fig8(50,75,22,50) ];
      // Neun: oben starten, Kopf gegen den Uhrzeigersinn, dann Strich runter
      case '9': { const cx=50,cy=52,rx=20,ry=24,start=-50;
                  const loop=arc(cx,cy,rx,ry,start,start-360);
                  const sx=cx+rx*Math.cos(start*Math.PI/180), sy=cy+ry*Math.sin(start*Math.PI/180);
                  return [ cat(loop, line(sx,sy,sx-6,127)) ]; }
    }
  }
  function getStrokes(n){
    if(n<=9) return {w:100, strokes:baseStrokes(String(n))};
    return {w:200, strokes: shift(baseStrokes('1'),-6).concat(shift(baseStrokes('0'),94))};
  }

  // ---------- Zustand ----------
  const cv=root.querySelector('#cv');
  const ctx=cv.getContext('2d');
  let dpr=1, cssW=0, cssH=0;
  let scale=1, offX=0, offY=0;
  let design={w:100,h:150};
  let strokes=[];          // [[ [x,y], ... ], ...]
  let samples=[];          // [{x,y}]
  let visited=[];          // bool je sample
  let trail=[];            // [ [ {x,y,good}, ... ], ... ]  (Teilstriche)
  let drawnTotal=0, drawnBad=0;
  let drawing=false, lastPt=null;
  let current=1;
  let tol=12;              // wirksame Abweichung (wird aus baseTol + Stufe berechnet)
  let solved=false;        // Straße glänzt golden
  let demoing=false;

  // ---------- Fortschritt / Stufen ----------
  const MAX_LEVEL=3;       // so viele „Perfekt“ bis eine Zahl gemeistert ist
  const TOL_STEP=2;        // pro Stufe wird die Straße so viel schmaler
  const MIN_TOL=6;         // schmalste Straße
  let baseTol=12;          // Start-Breite (vom Regler „Genauigkeit“)
  const progress={};       // n -> {level:0..MAX_LEVEL, tone:'none'|'red'|'yellow'|'green'}
  const PKEY='zahlenstrasse_progress_v1';

  // ---------- Layout / Transformation ----------
  function resize(){
    const rect=cv.getBoundingClientRect();
    cssW=rect.width; cssH=rect.height;
    dpr=Math.min(window.devicePixelRatio||1,2.5);
    cv.width=Math.round(cssW*dpr); cv.height=Math.round(cssH*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    const pad=34;
    const sx=(cssW-pad*2)/design.w;
    const sy=(cssH-pad*2)/design.h;
    scale=Math.min(sx,sy);
    offX=(cssW-design.w*scale)/2;
    offY=(cssH-design.h*scale)/2;
    redraw();
  }
  const DX=x=>offX+x*scale;
  const DY=y=>offY+y*scale;
  const toDesign=(cx,cy)=>[(cx-offX)/scale,(cy-offY)/scale];

  // ---------- Zahl laden ----------
  function loadNumber(n){
    current=n;
    const g=getStrokes(n);
    design={w:g.w,h:150};
    strokes=g.strokes;
    samples=[];
    for(const s of strokes) for(const p of s) samples.push({x:p[0],y:p[1]});
    visited=new Array(samples.length).fill(false);
    resetAttempt();
    [...root.querySelectorAll('.num-btn')].forEach(b=>{
      b.classList.toggle('active', +b.dataset.n===n);
      b.setAttribute('aria-pressed', +b.dataset.n===n);
    });
    resize();
  }
  function resetAttempt(){
    trail=[]; drawnTotal=0; drawnBad=0; solved=false;
    visited=new Array(samples.length).fill(false);
    hideToast();
    applyTol();            // Straßenbreite an die aktuelle Stufe anpassen + neu zeichnen
  }

  // ---------- Stufen / Straßenbreite ----------
  function effectiveTol(n){
    const lvl=(progress[n]&&progress[n].level)||0;
    return Math.max(MIN_TOL, baseTol - lvl*TOL_STEP);
  }
  function applyTol(){
    tol=effectiveTol(current);
    redraw();
  }
  const TONE_RANK={none:0,red:1,yellow:2,green:3};
  function bestTone(a,b){ return (TONE_RANK[b]||0)>(TONE_RANK[a]||0)?b:a; }

  // ---------- Zeichnen ----------
  function clearCanvas(){ ctx.clearRect(0,0,cssW,cssH); }

  function drawRoad(){
    ctx.lineCap='round'; ctx.lineJoin='round';
    const roadW=Math.max(10, 2*tol*scale);
    for(const s of strokes){
      ctx.beginPath();
      ctx.moveTo(DX(s[0][0]),DY(s[0][1]));
      for(let i=1;i<s.length;i++) ctx.lineTo(DX(s[i][0]),DY(s[i][1]));
      ctx.strokeStyle = solved ? '#F6E2A6' : 'var(--road)';
      ctx.strokeStyle = solved ? '#F6E2A6' : getCss('--road');
      ctx.lineWidth=roadW; ctx.stroke();
    }
    // Mittellinie gestrichelt
    ctx.save();
    ctx.setLineDash([6,7]);
    for(const s of strokes){
      ctx.beginPath();
      ctx.moveTo(DX(s[0][0]),DY(s[0][1]));
      for(let i=1;i<s.length;i++) ctx.lineTo(DX(s[i][0]),DY(s[i][1]));
      ctx.strokeStyle = solved ? getCss('--gold') : getCss('--center');
      ctx.lineWidth=Math.max(2,2.2*scale); ctx.stroke();
    }
    ctx.restore();
    // Start-Markierungen mit Pfeil + Nummer
    const placed=[];
    strokes.forEach((s,i)=>{
      const p=s[0], q=s[Math.min(6,s.length-1)];
      let ax=DX(p[0]), ay=DY(p[1]);
      // Überlappende Startpunkte leicht versetzen, damit beide sichtbar sind
      for(const m of placed){
        if(Math.hypot(ax-m[0],ay-m[1])<22*scale){ ax+=16*scale; ay-=4*scale; }
      }
      placed.push([ax,ay]);
      const ang=Math.atan2(DY(q[1])-DY(p[1]), DX(q[0])-DX(p[0]));
      // Pfeil
      const hx=ax+Math.cos(ang)*17*scale, hy=ay+Math.sin(ang)*17*scale;
      ctx.beginPath();
      ctx.moveTo(hx,hy);
      ctx.lineTo(hx-Math.cos(ang-0.5)*9*scale, hy-Math.sin(ang-0.5)*9*scale);
      ctx.lineTo(hx-Math.cos(ang+0.5)*9*scale, hy-Math.sin(ang+0.5)*9*scale);
      ctx.closePath(); ctx.fillStyle=getCss('--good'); ctx.fill();
      // Startpunkt
      ctx.beginPath(); ctx.arc(ax,ay,Math.max(8,9*scale),0,7);
      ctx.fillStyle=getCss('--good'); ctx.fill();
      ctx.fillStyle='#fff'; ctx.font=`600 ${Math.max(11,11*scale)}px Fredoka, sans-serif`;
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(String(i+1), ax, ay+0.5);
    });
  }

  function drawTrail(){
    const penW=Math.max(5,6*scale);
    ctx.lineCap='round'; ctx.lineJoin='round'; ctx.lineWidth=penW;
    for(const sub of trail){
      for(let i=1;i<sub.length;i++){
        const a=sub[i-1], b=sub[i];
        ctx.beginPath();
        ctx.moveTo(DX(a.x),DY(a.y)); ctx.lineTo(DX(b.x),DY(b.y));
        ctx.strokeStyle = b.good ? getCss('--good') : getCss('--bad');
        ctx.stroke();
      }
      if(sub.length===1){
        ctx.beginPath(); ctx.arc(DX(sub[0].x),DY(sub[0].y),penW/2,0,7);
        ctx.fillStyle=sub[0].good?getCss('--good'):getCss('--bad'); ctx.fill();
      }
    }
  }

  let guideIdx=0, guideFlat=[];
  function drawGuide(){
    if(!guideFlat.length) return;
    const p=guideFlat[Math.min(guideIdx,guideFlat.length-1)];
    ctx.beginPath(); ctx.arc(DX(p[0]),DY(p[1]),Math.max(9,10*scale),0,7);
    ctx.fillStyle=getCss('--accent'); ctx.fill();
    ctx.strokeStyle='#fff'; ctx.lineWidth=3; ctx.stroke();
  }

  function redraw(){
    clearCanvas();
    drawRoad();
    drawTrail();
    if(demoing) drawGuide();
  }

  // CSS-Variablen lesen (für Canvas)
  const _root=getComputedStyle(root);
  function getCss(v){ return _root.getPropertyValue(v).trim(); }

  // ---------- Treffer-Auswertung pro Punkt ----------
  function processPoint(x,y){
    let min=Infinity;
    for(let i=0;i<samples.length;i++){
      const d=Math.hypot(samples[i].x-x, samples[i].y-y);
      if(d<min) min=d;
      if(d<=tol) visited[i]=true;
    }
    const good = min<=tol;
    drawnTotal++; if(!good) drawnBad++;
    return good;
  }

  // ---------- Eingabe ----------
  function pointerDown(e){
    if(demoing) return;
    if(solved) resetAttempt();
    drawing=true; cv.setPointerCapture(e.pointerId);
    const r=cv.getBoundingClientRect();
    const [dx,dy]=toDesign(e.clientX-r.left, e.clientY-r.top);
    const good=processPoint(dx,dy);
    trail.push([{x:dx,y:dy,good}]);
    lastPt=[dx,dy];
    redraw();
  }
  function pointerMove(e){
    if(!drawing||demoing) return;
    const r=cv.getBoundingClientRect();
    const [dx,dy]=toDesign(e.clientX-r.left, e.clientY-r.top);
    const sub=trail[trail.length-1];
    // Zwischenpunkte einfügen, damit keine Lücken entstehen
    const dist=Math.hypot(dx-lastPt[0],dy-lastPt[1]);
    const steps=Math.max(1,Math.ceil(dist/(tol/2)));
    for(let i=1;i<=steps;i++){
      const t=i/steps;
      const px=lastPt[0]+(dx-lastPt[0])*t, py=lastPt[1]+(dy-lastPt[1])*t;
      const good=processPoint(px,py);
      sub.push({x:px,y:py,good});
    }
    lastPt=[dx,dy];
    redraw();
  }
  function pointerUp(){ drawing=false; lastPt=null; }

  on(cv,'pointerdown',pointerDown);
  on(cv,'pointermove',pointerMove);
  on(window,'pointerup',pointerUp);
  on(cv,'pointercancel',pointerUp);

  // ---------- Prüfen ----------
  function check(){
    if(demoing) return;
    const coverage = visited.filter(Boolean).length / samples.length;
    const offRatio = drawnTotal ? drawnBad/drawnTotal : 1;

    if(drawnTotal<12){
      showToast(0,"Los geht's!","Fahre die Zahl von Anfang bis Ende nach.");
      return;
    }
    let score=0;
    if(coverage>=0.55) score=1;
    if(coverage>=0.78 && offRatio<=0.28) score=2;
    if(coverage>=0.88 && offRatio<=0.14) score=3;

    // ---- Fortschritt der Zahl aktualisieren (grün/gelb/rot + Stufe) ----
    const tone = score>=3 ? 'green' : score>=2 ? 'yellow' : 'red';
    const rec = progress[current] || {level:0, tone:'none'};
    rec.tone = bestTone(rec.tone, tone);
    let leveledUp=false, justMastered=false;
    if(score>=3 && rec.level<MAX_LEVEL){
      rec.level++;
      leveledUp=true;
      justMastered = rec.level>=MAX_LEVEL;
    }
    progress[current]=rec;
    saveProgress();
    paintButton(current);
    updateSummary();
    // Die schmalere Straße greift beim nächsten Versuch (über resetAttempt).

    if(score>=2){
      solved=true; redraw();
      let msg, hint;
      if(justMastered){
        msg="Gemeistert! ⭐";
        hint="Diese Zahl sitzt – sie ist oben abgehakt ✓";
      } else if(leveledUp){
        msg="Perfekt! 🎉";
        hint="Stufe geschafft – jetzt wird die Straße schmaler! 🏁";
      } else if(score===3){
        msg="Perfekt nachgefahren! 🎉";
        hint="Wieder genau auf der Straße geblieben.";
      } else { // score===2 → gelb
        msg="Super gemacht! 👍";
        hint = offRatio>0.14
          ? "Fast perfekt – fahr für Grün noch genauer! 💚"
          : "Fast! Erwisch die ganze Zahl für Grün. 💚";
      }
      showToast(score,msg,hint);
      celebrate(); chime();
    } else {
      let msg, hint;
      if(coverage<0.6){ msg="Fast! 🙂"; hint="Fahre die ganze Zahl nach – vom Start (grüner Punkt) bis zum Ende."; }
      else { msg="Gut versucht!"; hint="Du bist oft von der Straße abgekommen (rot). Bleib in der breiten Bahn."; }
      showToast(score,msg,hint);
    }
  }

  // ---------- "Zeig mir" – Animation entlang der Striche ----------
  function showDemo(){
    if(demoing) return;
    resetAttempt();
    demoing=true;
    guideFlat=[];
    for(const s of strokes){ for(const p of s) guideFlat.push(p); guideFlat.push(null); }
    guideFlat=guideFlat.filter(p=>p); // einfache Variante: alle Punkte hintereinander
    guideIdx=0;
    let last=performance.now();
    function step(now){ if(destroyed||!demoing) return;
      const dt=now-last; last=now;
      guideIdx += Math.max(1, Math.round(dt/16)) * 2;
      redraw();
      if(guideIdx>=guideFlat.length){ demoing=false; setTimeout(redraw,80); return; }
      requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  // ---------- Ergebnis-Anzeige ----------
  const toast=root.querySelector('#toast');
  const starsEl=root.querySelector('#stars');
  const toastMsg=root.querySelector('#toastMsg');
  const toastHint=root.querySelector('#toastHint');
  let toastTimer=null;
  function showToast(score,msg,hint){
    let s="";
    for(let i=0;i<3;i++) s+=`<span class="${i<score?'star-on':'star-off'}">★</span>`;
    starsEl.innerHTML=s;
    toastMsg.textContent=msg;
    toastHint.textContent=hint;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer=setTimeout(hideToast, 4200);
  }
  function hideToast(){ toast.classList.remove('show'); }

  // ---------- Konfetti ----------
  const confLayer=root.querySelector('#conf');
  function celebrate(){
    if(reduceMotion) return;
    const emojis=['⭐','🌟','✨','🎈','🎉'];
    for(let i=0;i<16;i++){
      const sp=document.createElement('span');
      sp.className='conf';
      sp.textContent=emojis[Math.floor(Math.random()*emojis.length)];
      sp.style.left=(40+Math.random()*20)+'%';
      sp.style.top='55%';
      sp.style.setProperty('--fx',(Math.random()*240-120)+'px');
      sp.style.setProperty('--fy',(-160-Math.random()*180)+'px');
      sp.style.setProperty('--fr',(Math.random()*540-270)+'deg');
      sp.style.animation=`zs-pop ${900+Math.random()*500}ms ease-out forwards`;
      confLayer.appendChild(sp);
      setTimeout(()=>sp.remove(),1500);
    }
  }
  // ---------- Sanfter Erfolgs-Klang ----------
  let actx=null;
  function chime(){
    try{
      actx=actx||new (window.AudioContext||window.webkitAudioContext)();
      const notes=[523.25,659.25,783.99]; // C5 E5 G5
      notes.forEach((f,i)=>{
        const o=actx.createOscillator(), g=actx.createGain();
        o.type='sine'; o.frequency.value=f;
        const t=actx.currentTime+i*0.12;
        g.gain.setValueAtTime(0,t);
        g.gain.linearRampToValueAtTime(0.18,t+0.03);
        g.gain.exponentialRampToValueAtTime(0.0001,t+0.45);
        o.connect(g); g.connect(actx.destination);
        o.start(t); o.stop(t+0.5);
      });
    }catch(e){}
  }

  // ---------- Fortschritt speichern & anzeigen ----------
  function saveProgress(){ try{ localStorage.setItem(PKEY, JSON.stringify(progress)); }catch(e){} }
  function loadProgress(){
    try{ const r=localStorage.getItem(PKEY); if(r){ const o=JSON.parse(r); for(const k in o) progress[k]=o[k]; } }catch(e){}
  }
  const progFill=root.querySelector('#progFill');
  const progText=root.querySelector('#progText');
  function masteredCount(){ let c=0; for(let n=1;n<=10;n++) if(((progress[n]&&progress[n].level)||0)>=MAX_LEVEL) c++; return c; }
  function updateSummary(){
    const m=masteredCount();
    if(progText) progText.textContent=m+'/10 gemeistert';
    if(progFill) progFill.style.width=(m/10*100)+'%';
  }
  function paintButton(n){
    const b=root.querySelector('.num-btn[data-n="'+n+'"]');
    if(!b) return;
    const rec=progress[n]||{level:0,tone:'none'};
    b.classList.remove('s-red','s-yellow','s-green','mastered');
    if(rec.tone && rec.tone!=='none') b.classList.add('s-'+rec.tone);
    const mastered=(rec.level||0)>=MAX_LEVEL;
    b.classList.toggle('mastered',mastered);
    const pips=b.querySelector('.pips');
    if(pips){
      if(mastered || !(rec.level>0)){ pips.innerHTML=''; }
      else{ let h=''; for(let i=0;i<MAX_LEVEL;i++) h+='<i class="'+(i<rec.level?'on':'')+'"></i>'; pips.innerHTML=h; }
    }
    const lbl = mastered            ? 'Zahl '+n+', gemeistert'
              : rec.tone==='green'  ? 'Zahl '+n+', Stufe '+rec.level+' von '+MAX_LEVEL
              : rec.tone==='yellow' ? 'Zahl '+n+', fast geschafft'
              : rec.tone==='red'    ? 'Zahl '+n+', weiter üben'
              : 'Zahl '+n;
    b.setAttribute('aria-label',lbl);
  }
  function paintAll(){ for(let n=1;n<=10;n++) paintButton(n); }
  function resetAllProgress(){
    for(const k in progress) delete progress[k];
    saveProgress(); paintAll(); updateSummary(); applyTol();
  }

  // ---------- Buttons / Auswahl ----------
  const picker=root.querySelector('#picker'); picker.innerHTML='';
  for(let n=1;n<=10;n++){
    const b=document.createElement('button');
    b.className='num-btn'; b.dataset.n=n;
    b.setAttribute('aria-pressed','false');
    b.innerHTML='<span class="nf">'+n+'</span><span class="pips" aria-hidden="true"></span><span class="chk" aria-hidden="true">✓</span>';
    on(b,'click',()=>loadNumber(n));
    picker.appendChild(b);
  }
  on(root.querySelector('#btnClear'),'click',resetAttempt);
  on(root.querySelector('#btnShow'),'click',showDemo);
  on(root.querySelector('#btnCheck'),'click',check);
  on(root.querySelector('#tol'),'input',e=>{
    baseTol=+e.target.value; applyTol();
  });
  const btnReset=root.querySelector('#btnResetAll');
  if(btnReset) on(btnReset,'click',()=>{
    if(confirm('Fortschritt aller Zahlen löschen und für ein neues Kind neu starten?')) resetAllProgress();
  });

  on(window,'resize',resize);
  // Init
  baseTol=+root.querySelector('#tol').value || 12;
  loadProgress();
  paintAll();
  updateSummary();
  loadNumber(1);

  return function cleanup(){
    destroyed=true;
    offs.forEach(f=>{ try{f();}catch(e){} });
    try{ const pk=root.querySelector('#picker'); if(pk) pk.innerHTML=''; }catch(e){}
    try{ const cf=root.querySelector('#conf'); if(cf) cf.innerHTML=''; }catch(e){}
  };
}
