# KinetoFun Games — Project Context

## What Is This Project?

KinetoFun is a collection of **TV-first, gesture-controlled browser games** that use **MediaPipe Hands** for input. Every game is a standalone `index.html` file — no build tools, no frameworks, no external game engines.

---

## Absolute Rules (Never Break)

| Rule | Detail |
|---|---|
| **Single file** | One `index.html` per game. All JS + CSS inline. |
| **No frameworks** | No React, Vue, Svelte, Phaser, Three.js, etc. |
| **Plain Canvas 2D** | `canvas.getContext('2d')` only. |
| **MediaPipe Hands only** | Gameplay input comes exclusively from hand tracking. |
| **No mouse / keyboard gameplay** | Mouse/keyboard must NEVER drive core gameplay mechanics. |
| **Full-screen** | `position:fixed; inset:0; width:100vw; height:100vh` canvas. TV-first design. |
| **Camera preview** | Always show `#cam-wrap` with `#hcv` skeleton overlay, bottom-right corner. |

---

## Canonical File Structure (single `index.html`)

```
<!DOCTYPE html>
<html lang="en">
<head>
  <!-- charset, viewport, title, inline CSS -->
  <!-- CSS must include: #gc, #cam-wrap, #vid, #hcv, #cam-lbl, #loading, .spin -->
</head>
<body>
  <!-- Loading screen (#loading) -->
  <!-- Main canvas (#gc) -->
  <!-- Camera preview (#cam-wrap > video#vid + canvas#hcv + div#cam-lbl) -->

  <!-- MediaPipe CDN scripts (3 exact URLs — do not change versions) -->
  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915/hands.js" crossorigin="anonymous"></script>
  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.3.1640029074/camera_utils.js" crossorigin="anonymous"></script>
  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils@0.3.1620248257/drawing_utils.js" crossorigin="anonymous"></script>

  <script>
    /* 1. CANVAS */
    /* 2. AUDIO (Web Audio API only, no audio files) */
    /* 3. MEDIAPIPE HANDS — setupMediaPipe(), onHandResults() */
    /* 4. PARTICLES */
    /* 5. SETTINGS (localStorage) */
    /* 6. LEADERBOARD (localStorage) */
    /* 7. STATE MACHINE — let gs = 'menu' */
    /* 8. DRAW FUNCTIONS — drawMenu, drawHowTo, drawSettings, drawLeaderboard, drawResults, drawGame/drawCountdown */
    /* 9. GAME LOGIC — game-specific state, physics, collision */
    /* 10. DWELL NAVIGATION — regBtn, hovBtn, handleActivate, drawDwellCursor */
    /* 11. MAIN LOOP — function loop(ts) + requestAnimationFrame */
    /* 12. BOOT — requestAnimationFrame(t=>{lastT=t;loop(t);}); waitForMP(setupMediaPipe); */
  </script>
</body>
</html>
```

---

## CSS Template (copy exactly, adjust colors only)

```css
*{margin:0;padding:0;box-sizing:border-box;user-select:none;}
html,body{width:100%;height:100%;overflow:hidden;background:#000;
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;}
#gc{display:block;position:fixed;inset:0;width:100vw;height:100vh;}

#cam-wrap{
  position:fixed;bottom:14px;right:14px;width:160px;height:120px;
  border-radius:12px;overflow:hidden;border:2px solid rgba(255,255,255,.25);
  z-index:500;background:#111;
}
#cam-wrap video{width:100%;height:100%;object-fit:cover;transform:scaleX(-1);display:block;}
#hcv{position:absolute;inset:0;width:100%;height:100%;transform:scaleX(-1);}
#cam-lbl{position:absolute;top:5px;left:7px;font-size:9px;
  color:rgba(255,255,255,.6);font-weight:700;letter-spacing:.5px;}

#loading{position:fixed;inset:0;background:THEME_BG;display:flex;flex-direction:column;
  align-items:center;justify-content:center;gap:16px;z-index:1000;}
#loading h1{color:#fff;font-size:28px;font-weight:800;letter-spacing:2px;}
#loading p{color:rgba(255,255,255,.7);font-size:14px;text-align:center;
  max-width:260px;line-height:1.6;}
.spin{width:36px;height:36px;border:3px solid rgba(255,255,255,.1);
  border-top-color:ACCENT_COLOR;border-radius:50%;animation:sp .8s linear infinite;}
@keyframes sp{to{transform:rotate(360deg);}}
#lmsg{color:rgba(255,255,255,.4);font-size:12px;}
```

---

## MediaPipe Setup Pattern (copy exactly)

```js
const vidEl=document.getElementById('vid');
const hcv=document.getElementById('hcv'), hctx=hcv.getContext('2d');

function onHandResults(res){
  hcv.width=hcv.offsetWidth||160;
  hcv.height=hcv.offsetHeight||120;
  hctx.clearRect(0,0,hcv.width,hcv.height);
  // Clear your game hand data here

  if(res.multiHandLandmarks&&res.multiHandLandmarks.length>0){
    res.multiHandLandmarks.forEach((lm,idx)=>{
      const color=['rgba(255,77,196,.9)','rgba(77,200,255,.9)'][idx%2];
      drawConnectors(hctx,lm,HAND_CONNECTIONS,{color,lineWidth:1.5});
      drawLandmarks(hctx,lm,{color:'#fff',lineWidth:1,radius:2});
      // Mirror x: (1 - lm[0].x) * W for natural feel
      // Use lm[0] = wrist/palm center as hand position
    });
  }
  // Assign detected hands to your game entities here
}

function setupMediaPipe(){
  const hands=new Hands({locateFile:f=>`https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915/${f}`});
  hands.setOptions({maxNumHands:2,modelComplexity:1,minDetectionConfidence:0.7,minTrackingConfidence:0.5});
  hands.onResults(onHandResults);
  const cam=new Camera(vidEl,{onFrame:async()=>{await hands.send({image:vidEl});},width:320,height:240});
  cam.start()
    .then(()=>document.getElementById('loading').style.display='none')
    .catch(e=>{
      document.getElementById('lmsg').textContent='⚠ '+e.message;
      setTimeout(()=>document.getElementById('loading').style.display='none',2500);
    });
}

// Boot after scripts load
function waitForMP(cb,n=0){
  if(typeof Hands!=='undefined'&&typeof Camera!=='undefined') cb();
  else if(n>60){document.getElementById('lmsg').textContent='⚠ Load failed.';
    setTimeout(()=>document.getElementById('loading').style.display='none',2000);}
  else setTimeout(()=>waitForMP(cb,n+1),300);
}
waitForMP(setupMediaPipe);
```

**Hand coordinate conversion:**
```js
// Mirror x so hand movement feels natural (matches CSS scaleX(-1) on camera)
const screenX = (1 - landmark.x) * W;
const screenY = landmark.y * H;
// landmark[0] = wrist/palm center (best for position tracking)
// landmark[9] = middle finger base (alternative)
```

---

## Audio System (Web Audio API only — no audio files)

```js
let AC;
function getAC(){if(!AC)AC=new(window.AudioContext||window.webkitAudioContext)();return AC;}

function beep(freq, dur, type='sine', vol=0.3, delay=0){
  const a=getAC(),o=a.createOscillator(),g=a.createGain();
  o.connect(g);g.connect(a.destination);
  o.type=type; o.frequency.value=freq;
  g.gain.setValueAtTime(vol, a.currentTime+delay);
  g.gain.exponentialRampToValueAtTime(0.001, a.currentTime+delay+dur);
  o.start(a.currentTime+delay); o.stop(a.currentTime+delay+dur+0.05);
}

// Always call getAC() on first user gesture (inside handleActivate)
```

Common sound recipes:
- **Success / save**: `[523,659,784].forEach((f,i)=>beep(f,0.18,'sine',0.22,i*0.06))`
- **Fail / goal**: `beep(110,0.5,'sawtooth',0.28)`
- **Combo / cheer**: `[784,880,988,1047].forEach((f,i)=>beep(f,0.14,'triangle',0.2,i*0.07))`
- **Countdown tick**: `beep(660,0.12,'sine',0.3)`
- **GO!**: `beep(880,0.2,'sine',0.4); beep(1100,0.25,'sine',0.35,0.15)`
- **Whistle**: `beep(1400,0.18,'sine',0.5); beep(1200,0.12,'sine',0.4,0.22)`

---

## State Machine Pattern

```js
let gs='menu'; // menu | howto | settings | leaderboard | countdown | play | results
```

Every game uses exactly these states. Add game-specific sub-states as needed (e.g. `dance` / `freeze` in Dance Freeze).

---

## Particle System (copy exactly)

```js
let parts=[];
function spawnParticle(x,y,color,vx,vy,r,life){parts.push({x,y,vx,vy,r,color,life,max:life});}
function spawnBurst(x,y,color,n=18){
  for(let i=0;i<n;i++){
    const a=Math.random()*Math.PI*2,s=2+Math.random()*6;
    spawnParticle(x,y,color,Math.cos(a)*s,Math.sin(a)*s-2,2+Math.random()*5,40+Math.random()*30);
  }
}
function tickParts(){
  parts=parts.filter(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=0.15;p.vx*=0.95;p.life--;return p.life>0;});
}
function drawParts(){
  parts.forEach(p=>{cx.globalAlpha=p.life/p.max;cx.fillStyle=p.color;
    cx.beginPath();cx.arc(p.x,p.y,p.r,0,Math.PI*2);cx.fill();});
  cx.globalAlpha=1;
}
```

---

## Dwell Selection System (navigation without mouse/keyboard)

```js
let dwellId=null, dwellT=0;
const DWELL=900; // ms to hold hover before activating
let btns=[];

function regBtn(id,x,y,w,h){btns.push({id,x,y,w,h});}

function hovBtn(){
  // Get active hand position
  let hx=-1,hy=-1;
  // ... read from your game's hand tracking variables ...
  if(hx<0) return null;
  for(const b of btns){if(hx>=b.x&&hx<=b.x+b.w&&hy>=b.y&&hy<=b.y+b.h)return b.id;}
  return null;
}

// Inside loop(), for menu states:
const h=hovBtn();
if(h&&anyHandVisible){
  if(h!==dwellId){dwellId=h; dwellT=Date.now();}
  else if(Date.now()-dwellT>=DWELL){handleActivate(dwellId); dwellId=null;}
} else {dwellId=null;}

// Draw dwell progress arc (green circle around cursor):
function drawDwellCursor(){
  // draw ring at hand position
  if(dwellId){
    const p=Math.min((Date.now()-dwellT)/DWELL,1);
    cx.strokeStyle='#00ff88'; cx.lineWidth=3;
    cx.beginPath();cx.arc(hx,hy,22,-Math.PI/2,-Math.PI/2+p*Math.PI*2);cx.stroke();
  }
}
```

Draw a green progress bar under each button while hovering:
```js
if(hov&&p>0){
  cx.beginPath();cx.roundRect(bx+4,ry+bh-6,(bw-8)*p,4,3);
  cx.fillStyle='#00ff88';cx.fill();
}
```

---

## Settings (localStorage) Pattern

```js
const DEF_SETTINGS={sensitivity:3, maxLives:3, effects:true};
let settings=Object.assign({},DEF_SETTINGS,JSON.parse(localStorage.getItem('GAME_KEY_settings')||'{}'));
function saveSettings(){localStorage.setItem('GAME_KEY_settings',JSON.stringify(settings));}
```

---

## Leaderboard Pattern

```js
function getLeaderboard(){return JSON.parse(localStorage.getItem('GAME_KEY_lb')||'[]');}
function saveLeaderboard(lb){localStorage.setItem('GAME_KEY_lb',JSON.stringify(lb));}
function addToLeaderboard(score,...extra){
  const lb=getLeaderboard();
  lb.push({score,...extra,date:new Date().toLocaleDateString()});
  lb.sort((a,b)=>b.score-a.score);
  saveLeaderboard(lb.slice(0,20));
}
```

---

## Main Loop Pattern

```js
let lastT=0;
function loop(ts){
  const dt=Math.min((ts-lastT)/1000,0.1); lastT=ts;

  // 1. Dwell logic (only in menu states)
  // 2. Update game state timers / physics
  // 3. tickParts()
  // 4. Render switch on gs

  requestAnimationFrame(loop);
}
requestAnimationFrame(t=>{lastT=t; loop(t);});
```

`dt` is clamped to 0.1s to prevent spiral-of-death on tab blur/focus.

---

## Shared Draw Helpers (always include)

```js
function rnd(a,b){return a+Math.random()*(b-a);}
function txt(s,x,y,font,color,align='center'){
  cx.fillStyle=color;cx.font=font;cx.textAlign=align;cx.fillText(s,x,y);
}
function card(x,y,w,h,r,fill,stroke,lw){
  cx.beginPath();cx.roundRect(x,y,w,h,r);
  if(fill){cx.fillStyle=fill;cx.fill();}
  if(stroke){cx.strokeStyle=stroke;cx.lineWidth=lw||2;cx.stroke();}
}
```

---

## Countdown Pattern

```js
let countdownVal=3, countdownTimer=4;

// In loop():
if(gs==='countdown'){
  countdownTimer-=dt;
  const nv=Math.max(0,Math.ceil(countdownTimer)-1);
  if(nv!==countdownVal&&nv>=0){countdownVal=nv; sfxCountdown();}
  if(countdownTimer<=0){sfxGo(); gs='play';}
}

// drawCountdown() shows: drawBackground(); big number text; drawGloves/hands
```

---

## Games Built So Far

| Game | File | Input | Status |
|---|---|---|---|
| Dance Freeze | `games/dance-freeze/index.html` | MediaPipe Hands (4 players, motion detection) | ✅ Done |
| Goalkeeper Hero | `games/goalkeeper-hero/index.html` | MediaPipe Hands (2 gloves, position) | ✅ Done |
| Gesture Chef | `games/gesture-chef/` | React + Camera (non-standard, older style) | ⚠️ Different architecture |
| Gesture Math Adventure | `games/gesture-math-adventure/index.html` | MediaPipe Hands + Pose (point/dwell + jump/crouch) | ✅ Done |

---

## Color Palette Conventions

Each game has a **theme color** used for accents, glows, and loading spinner:

| Game | Theme | Accent |
|---|---|---|
| Dance Freeze | Purple night `#0a0015` | `#c44dff` |
| Goalkeeper Hero | Dark stadium `#001a10` | `#00cc66` |
| New games | Pick a unique dark bg | Pick a unique accent |

Shared across all games:
- Success / save: `#00ff88` (green)
- Danger / fail: `#ff3333` (red)
- Combo / gold: `#ffe04d` (yellow)
- Info / back: `#4dc8ff` (cyan)

---

## Difficulty Progression Pattern

Structure difficulty as a pure function of game state (score, saves, time, level):

```js
function getDiff(){
  if(level<=3)  return {speed:SLOW,  interval:LONG,  ...};
  if(level<=7)  return {speed:MED,   interval:MED,   ...};
  if(level<=12) return {speed:FAST,  interval:SHORT, ...};
  return               {speed:VFAST, interval:VSHORT,...}; // penalty mode
}
```

Level is derived from score/saves — never hardcoded timers.

---

## Collision Pattern (circular)

```js
function circleCollide(ax,ay,ar, bx,by,br){
  const dx=ax-bx, dy=ay-by;
  return Math.sqrt(dx*dx+dy*dy) < ar+br;
}
```

---

## Things to Avoid

- ❌ DOM elements for gameplay (buttons, divs as hit areas)
- ❌ CSS transitions/animations for gameplay state
- ❌ `setInterval` for game loop (use `requestAnimationFrame`)
- ❌ External fonts (use `-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif`)
- ❌ Comments that describe WHAT code does (only WHY if non-obvious)
- ❌ Keyboard/mouse handlers wired to gameplay mechanics
- ❌ `document.createElement` during the game loop (only at init)
