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
  // ---------- Buchstaben-Glyphen: SVG-Pfade → Striche (Box 100 x 150) ----------
  // Jeder Teilpfad (eigenes "M") wird ein eigener Strich mit eigener Startmarke.
  const NS_SVG='http://www.w3.org/2000/svg';
  const _glyphSvg=document.createElementNS(NS_SVG,'svg');
  _glyphSvg.setAttribute('aria-hidden','true');
  _glyphSvg.style.cssText='position:absolute;width:0;height:0;overflow:hidden;pointer-events:none;';
  root.appendChild(_glyphSvg);
  function pathToStrokes(d){
    if(!d) return [];
    const subs=d.split(/(?=[Mm])/).map(s=>s.trim()).filter(Boolean);
    const out=[];
    for(let sub of subs){
      if(!/^[Mm]/.test(sub)) sub='M'+sub;
      const p=document.createElementNS(NS_SVG,'path');
      p.setAttribute('d',sub); _glyphSvg.appendChild(p);
      let len=0; try{ len=p.getTotalLength(); }catch(e){ len=0; }
      if(len<0.5){
        const m=sub.match(/[Mm]\s*(-?[\d.]+)[ ,]+(-?[\d.]+)/);
        if(m) out.push([[+m[1],+m[2]]]);
      } else {
        const n=Math.max(2,Math.round(len/2.2)); const pts=[];
        for(let i=0;i<=n;i++){ const pt=p.getPointAtLength(len*i/n); pts.push([pt.x,pt.y]); }
        out.push(pts);
      }
      _glyphSvg.removeChild(p);
    }
    return out;
  }

  // Druckschrift-Buchstaben in kindgerechter Schreibrichtung. Großbuchstaben:
  // Oberkante 26, Grundlinie 126. Kleinbuchstaben: x-Höhe 67, Grundlinie 126,
  // Oberlängen bis 24, Unterlängen bis 150.
  const GLYPH_PATHS={
    A:'M28 126L50 26L72 126M37 88L63 88',
    B:'M31 26L31 126M31 26L52 26Q70 26 70 50Q70 75 48 75L31 75M31 75L54 75Q72 75 72 100Q72 126 50 126L31 126',
    C:'M70 50Q70 28 48 26Q26 26 26 76Q26 126 48 124Q70 122 70 100',
    D:'M31 26L31 126M31 26L48 26Q72 26 72 76Q72 126 48 126L31 126',
    E:'M33 26L33 126M33 26L70 26M33 76L62 76M33 126L70 126',
    F:'M33 26L33 126M33 26L70 26M33 76L60 76',
    G:'M70 50Q70 28 48 26Q26 26 26 76Q26 126 48 124Q70 122 70 100L70 82L54 82',
    H:'M31 26L31 126M71 26L71 126M31 76L71 76',
    I:'M38 26L62 26M50 26L50 126M38 126L62 126',
    J:'M48 26L70 26M61 26L61 104Q61 126 43 126Q28 126 28 108',
    K:'M32 26L32 126M68 28L34 78M40 72L70 126',
    L:'M33 26L33 126L70 126',
    M:'M26 126L26 26L50 88L74 26L74 126',
    N:'M30 126L30 26L70 126L70 26',
    O:'M50 26Q26 26 26 76Q26 126 50 126Q74 126 74 76Q74 26 50 26',
    P:'M32 26L32 126M32 26L52 26Q72 26 72 51Q72 77 50 77L32 77',
    Q:'M50 26Q26 26 26 76Q26 124 50 124Q74 124 74 76Q74 26 50 26M58 104L78 132',
    R:'M32 26L32 126M32 26L52 26Q72 26 72 51Q72 77 50 77L32 77M50 77L72 126',
    S:'M70 48Q70 26 48 26Q26 26 26 50Q26 72 50 76Q74 80 74 102Q74 126 50 126Q28 126 28 104',
    T:'M28 27L72 27M50 27L50 126',
    U:'M30 26L30 100Q30 126 50 126Q70 126 70 100L70 26',
    V:'M28 26L50 126L72 26',
    W:'M22 26L36 126L50 54L64 126L78 26',
    X:'M30 26L70 126M70 26L30 126',
    Y:'M30 26L50 80L70 26M50 80L50 126',
    Z:'M30 27L70 27L30 126L70 126',
    a:'M66 67L66 126M66 80Q54 67 42 67Q26 67 26 96Q26 126 42 126Q56 126 66 113',
    b:'M30 24L30 126M30 80Q42 67 55 67Q72 67 72 96Q72 126 55 126Q40 126 30 113',
    c:'M68 79Q58 67 46 67Q26 67 26 96Q26 126 46 126Q58 126 68 114',
    d:'M70 24L70 126M70 80Q58 67 45 67Q28 67 28 96Q28 126 45 126Q60 126 70 113',
    e:'M27 99L70 99Q70 67 48 67Q26 67 26 96Q26 126 48 126Q62 126 70 113',
    f:'M64 31Q49 22 42 39L42 126M28 73L60 73',
    g:'M68 80Q56 67 44 67Q26 67 26 95Q26 122 44 122Q62 122 68 110M68 67L68 133Q68 150 47 150Q31 150 29 137',
    h:'M30 24L30 126M30 81Q41 67 53 67Q70 67 70 89L70 126',
    i:'M50 71L50 126M50 53L50 57',
    j:'M52 71L52 133Q52 150 35 150Q25 150 25 139M52 53L52 57',
    k:'M32 24L32 126M64 71L36 99L66 126',
    l:'M48 24L48 119Q48 127 58 126',
    m:'M24 67L24 126M24 81Q32 67 41 67Q50 67 50 83L50 126M50 83Q58 67 67 67Q76 67 76 83L76 126',
    n:'M30 67L30 126M30 81Q41 67 53 67Q70 67 70 89L70 126',
    o:'M50 67Q28 67 28 96Q28 126 50 126Q72 126 72 96Q72 67 50 67',
    p:'M30 67L30 150M30 80Q42 67 55 67Q72 67 72 96Q72 124 55 124Q40 124 30 111',
    q:'M70 67L70 150M70 80Q58 67 45 67Q28 67 28 96Q28 124 45 124Q60 124 70 111',
    r:'M32 67L32 126M32 83Q42 67 58 67Q66 67 70 72',
    s:'M66 76Q66 67 48 67Q31 67 31 85Q31 98 50 99Q70 100 70 113Q70 126 50 126Q33 126 33 117',
    t:'M44 41L44 114Q44 126 58 126M30 72L62 72',
    u:'M30 67L30 108Q30 126 50 126Q66 126 70 111L70 67M70 67L70 126',
    v:'M30 67L50 126L70 67',
    w:'M24 67L36 126L50 82L64 126L76 67',
    x:'M32 67L68 126M68 67L32 126',
    y:'M30 67L50 117M70 67L44 150',
    z:'M30 67L68 67L30 126L68 126',
  };

  // ---------- Modi / Zeichensätze ----------
  const SETS={
    zahlen:['1','2','3','4','5','6','7','8','9','10'],
    gross:'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
    klein:'abcdefghijklmnopqrstuvwxyz'.split(''),
  };
  let mode='zahlen';
  const curSet=()=>SETS[mode];

  function getStrokes(tok){
    tok=String(tok);
    if(tok==='10') return {w:200, strokes: shift(baseStrokes('1'),-6).concat(shift(baseStrokes('0'),94))};
    if(/^[0-9]$/.test(tok)) return {w:100, strokes: baseStrokes(tok)};
    return {w:100, strokes: pathToStrokes(GLYPH_PATHS[tok]||'')};
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
  let scored=false;        // aktuelle Spur wurde bereits gewertet (verhindert Mehrfach-Prüfen)
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

  // ---------- Zeichen laden (Zahl oder Buchstabe) ----------
  function loadItem(tok){
    tok=String(tok);
    current=tok;
    const g=getStrokes(tok);
    design={w:g.w,h:150};
    strokes=g.strokes;
    samples=[];
    for(const s of strokes) for(const p of s) samples.push({x:p[0],y:p[1]});
    visited=new Array(samples.length).fill(false);
    resetAttempt();
    [...root.querySelectorAll('.num-btn')].forEach(b=>{
      const sel=b.dataset.n===tok;
      b.classList.toggle('active', sel);
      b.setAttribute('aria-pressed', sel);
    });
    resize();
  }
  function resetAttempt(){
    trail=[]; drawnTotal=0; drawnBad=0; solved=false; scored=false;
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
    scored=false;          // neues Zeichnen → der nächste „Prüfen“-Klick wertet wieder
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
    // Eine Spur zählt nur EINMAL. Wer „Prüfen“ erneut klickt, ohne neu
    // nachzufahren, kann die Stufe nicht weiter hochzählen.
    if(scored){
      showToast(0,"Schon geprüft 🙂","Fahre die Form noch einmal nach – dann wieder auf ✓ Prüfen.");
      return;
    }
    const coverage = visited.filter(Boolean).length / samples.length;
    const offRatio = drawnTotal ? drawnBad/drawnTotal : 1;

    if(drawnTotal<12){
      showToast(0,"Los geht's!","Fahre die Form von Anfang bis Ende nach.");
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
    scored=true;           // diese Spur ist nun gewertet – erst neues Nachfahren zählt wieder
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
          : "Fast! Erwisch die ganze Form für Grün. 💚";
      }
      showToast(score,msg,hint);
      celebrate(); chime();
    } else {
      let msg, hint;
      if(coverage<0.6){ msg="Fast! 🙂"; hint="Fahre die ganze Form nach – vom Start (grüner Punkt) bis zum Ende."; }
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
  const KIND = ()=> mode==='zahlen' ? 'Zahl' : 'Buchstabe';
  function masteredCount(){ let c=0; for(const tok of curSet()) if(((progress[tok]&&progress[tok].level)||0)>=MAX_LEVEL) c++; return c; }
  function updateSummary(){
    const m=masteredCount(), total=curSet().length;
    if(progText) progText.textContent=m+'/'+total+' gemeistert';
    if(progFill) progFill.style.width=(m/total*100)+'%';
  }
  function paintButton(tok){
    const b=root.querySelector('.num-btn[data-n="'+tok+'"]');
    if(!b) return;
    const rec=progress[tok]||{level:0,tone:'none'};
    b.classList.remove('s-red','s-yellow','s-green','mastered');
    if(rec.tone && rec.tone!=='none') b.classList.add('s-'+rec.tone);
    const mastered=(rec.level||0)>=MAX_LEVEL;
    b.classList.toggle('mastered',mastered);
    const pips=b.querySelector('.pips');
    if(pips){
      if(mastered || !(rec.level>0)){ pips.innerHTML=''; }
      else{ let h=''; for(let i=0;i<MAX_LEVEL;i++) h+='<i class="'+(i<rec.level?'on':'')+'"></i>'; pips.innerHTML=h; }
    }
    const k=KIND();
    const lbl = mastered            ? k+' '+tok+', gemeistert'
              : rec.tone==='green'  ? k+' '+tok+', Stufe '+rec.level+' von '+MAX_LEVEL
              : rec.tone==='yellow' ? k+' '+tok+', fast geschafft'
              : rec.tone==='red'    ? k+' '+tok+', weiter üben'
              : k+' '+tok;
    b.setAttribute('aria-label',lbl);
  }
  function paintAll(){ for(const tok of curSet()) paintButton(tok); }
  function resetAllProgress(){
    for(const k in progress) delete progress[k];
    saveProgress(); paintAll(); updateSummary(); applyTol();
  }

  // ---------- Auswahl-Felder (je nach Modus) ----------
  const picker=root.querySelector('#picker');
  function buildPicker(){
    picker.innerHTML='';
    for(const tok of curSet()){
      const b=document.createElement('button');
      b.className='num-btn'; b.dataset.n=tok;
      b.setAttribute('aria-pressed','false');
      b.innerHTML='<span class="nf">'+tok+'</span><span class="pips" aria-hidden="true"></span><span class="chk" aria-hidden="true">✓</span>';
      on(b,'click',()=>loadItem(tok));
      picker.appendChild(b);
    }
  }

  // ---------- Reiter: Zahlen / Großbuchstaben / Kleinbuchstaben ----------
  const TABS=[['zahlen','Zahlen'],['gross','ABC'],['klein','abc']];
  function buildTabs(){
    const t=root.querySelector('#modeTabs'); if(!t) return;
    t.innerHTML='';
    for(const [m,label] of TABS){
      const b=document.createElement('button');
      const sel=m===mode;
      b.className='zs-tab'+(sel?' active':''); b.type='button';
      b.dataset.mode=m; b.setAttribute('role','tab'); b.setAttribute('aria-selected', sel?'true':'false');
      b.textContent=label;
      on(b,'click',()=>setMode(m));
      t.appendChild(b);
    }
  }
  function setMode(m){
    if(m===mode || !SETS[m]) return;
    mode=m;
    [...root.querySelectorAll('.zs-tab')].forEach(b=>{
      const sel=b.dataset.mode===m;
      b.classList.toggle('active',sel);
      b.setAttribute('aria-selected', sel?'true':'false');
    });
    buildPicker(); paintAll(); updateSummary();
    loadItem(curSet()[0]);
  }

  on(root.querySelector('#btnClear'),'click',resetAttempt);
  on(root.querySelector('#btnShow'),'click',showDemo);
  on(root.querySelector('#btnCheck'),'click',check);
  on(root.querySelector('#tol'),'input',e=>{
    baseTol=+e.target.value; applyTol();
  });
  // „Neues Kind“ mit eigenem Bestätigungs-Dialog (window.confirm ist auf
  // iPad/Safari unzuverlässig und wurde dort teils gar nicht angezeigt).
  const confirmEl=root.querySelector('#zsConfirm');
  const showConfirm=(show)=>{ if(!confirmEl) return; if(show) confirmEl.removeAttribute('hidden'); else confirmEl.setAttribute('hidden',''); };
  const btnReset=root.querySelector('#btnResetAll');
  if(btnReset) on(btnReset,'click',()=>{ if(confirmEl) showConfirm(true); else resetAllProgress(); });
  const cYes=root.querySelector('#zsConfirmYes'), cNo=root.querySelector('#zsConfirmNo');
  if(cYes) on(cYes,'click',()=>{ resetAllProgress(); showConfirm(false); });
  if(cNo) on(cNo,'click',()=>showConfirm(false));
  if(confirmEl) on(confirmEl,'click',(e)=>{ if(e.target===confirmEl) showConfirm(false); });

  on(window,'resize',resize);
  // Init
  baseTol=+root.querySelector('#tol').value || 12;
  loadProgress();
  buildTabs();
  buildPicker();
  paintAll();
  updateSummary();
  loadItem(curSet()[0]);

  return function cleanup(){
    destroyed=true;
    offs.forEach(f=>{ try{f();}catch(e){} });
    try{ const pk=root.querySelector('#picker'); if(pk) pk.innerHTML=''; }catch(e){}
    try{ const tb=root.querySelector('#modeTabs'); if(tb) tb.innerHTML=''; }catch(e){}
    try{ const cf=root.querySelector('#conf'); if(cf) cf.innerHTML=''; }catch(e){}
    try{ if(_glyphSvg && _glyphSvg.parentNode) _glyphSvg.parentNode.removeChild(_glyphSvg); }catch(e){}
  };
}
