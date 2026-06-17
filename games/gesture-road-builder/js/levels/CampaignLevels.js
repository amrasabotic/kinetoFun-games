window.GRB = window.GRB || {};

// Level format:
// id, name, worldWidth, ink (pixel budget), bg (0=day,1=sunset,2=night,3=cave),
// start:[x,y], finish:[x,y]
// platforms: [[x,y,w,h], ...] — static ground segments  (x,y = center)
// stars: [[x,y], ...]
// crates: [[x,y,w,h], ...]  — dynamic boxes
// boulders: [[x,y,r], ...]  — dynamic circles
// seesaws: [[cx,cy,w], ...]  — pivot in center, plank of width w
// movingPlatforms: [[x,y,w,h, rangeX, rangeY, speed], ...] — oscillate by range at speed

GRB.CAMPAIGN_LEVELS = [
  // ─── TIER 1 (1–10): Basics ────────────────────────────────────────────────
  {
    id:1, name:'First Steps', worldWidth:960, ink:99999, bg:0,
    start:[100,430], finish:[860,430],
    platforms:[[200,480,400,40],[600,480,400,40]],
    stars:[[480,400],[580,390],[680,400]], crates:[], boulders:[], seesaws:[], movingPlatforms:[]
  },
  {
    id:2, name:'Double Gap', worldWidth:1280, ink:99999, bg:0,
    start:[100,430], finish:[1180,430],
    platforms:[[200,480,360,40],[640,480,200,40],[980,480,360,40]],
    stars:[[430,400],[640,360],[870,400]], crates:[], boulders:[], seesaws:[], movingPlatforms:[]
  },
  {
    id:3, name:'Going Up', worldWidth:960, ink:99999, bg:0,
    start:[100,490], finish:[860,280],
    platforms:[[200,510,360,30],[700,300,360,30]],
    stars:[[480,430],[600,370],[760,270]], crates:[], boulders:[], seesaws:[], movingPlatforms:[]
  },
  {
    id:4, name:'Coming Down', worldWidth:960, ink:99999, bg:1,
    start:[100,280], finish:[860,490],
    platforms:[[200,300,360,30],[700,510,360,30]],
    stars:[[340,260],[500,390],[660,460]], crates:[], boulders:[], seesaws:[], movingPlatforms:[]
  },
  {
    id:5, name:'Star Seeker', worldWidth:960, ink:600, bg:0,
    start:[100,430], finish:[860,430],
    platforms:[[200,480,360,40],[600,480,360,40]],
    stars:[[380,360],[480,330],[580,360],[680,390]], crates:[], boulders:[], seesaws:[], movingPlatforms:[]
  },
  {
    id:6, name:'The Chasm', worldWidth:960, ink:99999, bg:1,
    start:[80,430], finish:[880,430],
    platforms:[[180,480,280,40],[780,480,280,40]],
    stars:[[480,380]], crates:[], boulders:[], seesaws:[], movingPlatforms:[]
  },
  {
    id:7, name:'Boulder Run', worldWidth:960, ink:800, bg:0,
    start:[80,430], finish:[880,430],
    platforms:[[180,480,300,40],[680,480,300,40]],
    stars:[[480,400]], crates:[], boulders:[[480,300,22]], seesaws:[], movingPlatforms:[]
  },
  {
    id:8, name:'Crate Bridge', worldWidth:960, ink:700, bg:0,
    start:[80,430], finish:[880,430],
    platforms:[[180,480,300,40],[680,480,300,40]],
    stars:[[480,390]], crates:[[480,440,32,32],[480,408,32,32]], boulders:[], seesaws:[], movingPlatforms:[]
  },
  {
    id:9, name:'Moving On', worldWidth:1100, ink:700, bg:0,
    start:[80,430], finish:[1020,430],
    platforms:[[180,480,280,40],[840,480,280,40]],
    stars:[[560,390],[700,380]], crates:[], boulders:[], seesaws:[],
    movingPlatforms:[[530,460,160,20,200,0,1.2]]
  },
  {
    id:10, name:'Combo Platter', worldWidth:1200, ink:900, bg:1,
    start:[80,430], finish:[1120,430],
    platforms:[[180,480,280,40],[560,480,160,40],[900,480,280,40]],
    stars:[[420,400],[560,410],[700,400]], crates:[[700,440,30,30]], boulders:[[700,320,18]],
    seesaws:[], movingPlatforms:[]
  },

  // ─── TIER 2 (11–20): Intermediate ─────────────────────────────────────────
  {
    id:11, name:'Seesaw City', worldWidth:960, ink:500, bg:0,
    start:[80,430], finish:[880,430],
    platforms:[[180,480,260,40],[740,480,260,40]],
    stars:[[480,380]], crates:[], boulders:[], seesaws:[[480,440,220]], movingPlatforms:[]
  },
  {
    id:12, name:'Island Hop', worldWidth:1400, ink:1000, bg:0,
    start:[80,430], finish:[1320,430],
    platforms:[[180,480,220,40],[520,480,140,40],[760,480,140,40],[1100,480,300,40]],
    stars:[[380,400],[640,400],[950,400]], crates:[], boulders:[], seesaws:[], movingPlatforms:[]
  },
  {
    id:13, name:'Canyon Deep', worldWidth:960, ink:99999, bg:3,
    start:[80,300], finish:[880,300],
    platforms:[[180,320,280,30],[740,320,220,30]],
    stars:[[480,280],[600,260]], crates:[], boulders:[], seesaws:[], movingPlatforms:[],
    _note:'level sits high, big drop below'
  },
  {
    id:14, name:'Narrow Pass', worldWidth:1200, ink:500, bg:3,
    start:[80,460], finish:[1120,460],
    platforms:[[180,490,260,30],[520,490,80,30],[720,490,80,30],[920,490,260,30]],
    stars:[[400,460],[620,460],[820,460]], crates:[], boulders:[], seesaws:[], movingPlatforms:[]
  },
  {
    id:15, name:'Crate Tower', worldWidth:960, ink:700, bg:0,
    start:[80,430], finish:[880,430],
    platforms:[[180,480,260,40],[700,480,260,40]],
    stars:[[480,330]], crates:[[480,460,40,40],[480,420,40,40],[480,380,40,40]], boulders:[],
    seesaws:[], movingPlatforms:[]
  },
  {
    id:16, name:'Timing Gap', worldWidth:1100, ink:700, bg:1,
    start:[80,430], finish:[1020,430],
    platforms:[[180,480,260,40],[860,480,260,40]],
    stars:[[560,380],[700,380]], crates:[], boulders:[],
    seesaws:[], movingPlatforms:[[540,460,180,20,0,0,1.5],[700,440,180,20,0,0,1.8]]
  },
  {
    id:17, name:'Double Boulder', worldWidth:1100, ink:800, bg:0,
    start:[80,430], finish:[1020,430],
    platforms:[[180,480,260,40],[550,480,100,40],[860,480,260,40]],
    stars:[[550,410]], crates:[], boulders:[[400,200,22],[650,200,22]], seesaws:[], movingPlatforms:[]
  },
  {
    id:18, name:'Sky High', worldWidth:1200, ink:99999, bg:2,
    start:[80,430], finish:[1120,220],
    platforms:[[180,480,300,40],[600,340,200,30],[960,240,300,30]],
    stars:[[400,410],[700,310],[1000,210]], crates:[], boulders:[], seesaws:[], movingPlatforms:[]
  },
  {
    id:19, name:'Underground', worldWidth:1300, ink:850, bg:3,
    start:[80,460], finish:[1220,460],
    platforms:[[180,500,280,40],[560,500,160,40],[900,500,200,40]],
    stars:[[430,460],[650,420],[1000,450]], crates:[[650,460,30,30]], boulders:[],
    seesaws:[], movingPlatforms:[]
  },
  {
    id:20, name:'The Tower', worldWidth:960, ink:900, bg:2,
    start:[80,490], finish:[880,120],
    platforms:[[180,510,300,30],[600,350,180,20],[780,200,300,30]],
    stars:[[340,490],[690,320],[840,180]], crates:[], boulders:[],
    seesaws:[], movingPlatforms:[[600,350,180,20,0,0,0]]
  },

  // ─── TIER 3 (21–30): Advanced ──────────────────────────────────────────────
  {
    id:21, name:'Zigzag', worldWidth:1600, ink:1100, bg:1,
    start:[80,480], finish:[1520,480],
    platforms:[[180,510,200,30],[500,380,160,20],[820,510,160,20],[1100,380,160,20],[1360,510,280,30]],
    stars:[[340,460],[660,360],[940,460],[1200,360]], crates:[], boulders:[], seesaws:[], movingPlatforms:[]
  },
  {
    id:22, name:'Moving Maze', worldWidth:1400, ink:800, bg:0,
    start:[80,430], finish:[1320,430],
    platforms:[[180,480,260,40],[1140,480,260,40]],
    stars:[[560,380],[800,380],[1040,380]], crates:[], boulders:[],
    seesaws:[], movingPlatforms:[[540,440,180,20,200,0,1.5],[780,440,180,20,180,0,2],[1020,440,180,20,160,0,1.8]]
  },
  {
    id:23, name:'Boulder Gauntlet', worldWidth:1500, ink:1000, bg:3,
    start:[80,430], finish:[1420,430],
    platforms:[[180,480,280,40],[600,480,120,40],[900,480,120,40],[1200,480,280,40]],
    stars:[[720,420]], crates:[], boulders:[[400,200,20],[720,200,20],[1000,200,20]], seesaws:[], movingPlatforms:[]
  },
  {
    id:24, name:'Seesaw Chain', worldWidth:1400, ink:700, bg:0,
    start:[80,430], finish:[1320,430],
    platforms:[[180,480,220,40],[1220,480,220,40]],
    stars:[[560,380],[880,380]], crates:[], boulders:[],
    seesaws:[[480,440,200],[880,440,200]], movingPlatforms:[]
  },
  {
    id:25, name:'Precision Jump', worldWidth:1000, ink:400, bg:2,
    start:[80,430], finish:[920,430],
    platforms:[[180,480,260,40],[600,480,60,40],[840,480,260,40]],
    stars:[[600,420]], crates:[], boulders:[], seesaws:[], movingPlatforms:[]
  },
  {
    id:26, name:'Falling Rocks', worldWidth:1000, ink:700, bg:3,
    start:[80,430], finish:[920,430],
    platforms:[[180,480,280,40],[720,480,280,40]],
    stars:[[480,420]], crates:[], boulders:[[380,100,18],[480,80,22],[580,110,18]], seesaws:[], movingPlatforms:[]
  },
  {
    id:27, name:'Twin Chasms', worldWidth:1400, ink:1000, bg:1,
    start:[80,430], finish:[1320,430],
    platforms:[[180,480,240,40],[580,480,120,40],[900,480,120,40],[1220,480,220,40]],
    stars:[[380,420],[740,420],[1060,420]], crates:[], boulders:[], seesaws:[], movingPlatforms:[]
  },
  {
    id:28, name:'The Void', worldWidth:1600, ink:1300, bg:2,
    start:[80,430], finish:[1520,430],
    platforms:[[180,480,200,40],[540,480,60,40],[780,480,60,40],[1020,480,60,40],[1340,480,260,40]],
    stars:[[400,410],[660,410],[900,410],[1120,410]], crates:[], boulders:[], seesaws:[], movingPlatforms:[]
  },
  {
    id:29, name:'Speed Run', worldWidth:1800, ink:1400, bg:1,
    start:[80,430], finish:[1720,430],
    platforms:[[180,480,300,40],[680,480,200,40],[1140,480,200,40],[1580,480,300,40]],
    stars:[[430,420],[780,420],[1240,420],[1640,420]], crates:[], boulders:[[900,200,18]], seesaws:[], movingPlatforms:[]
  },
  {
    id:30, name:'Halfway Boss', worldWidth:1400, ink:900, bg:3,
    start:[80,430], finish:[1320,430],
    platforms:[[180,480,260,40],[700,480,100,40],[1160,480,260,40]],
    stars:[[480,400],[700,420],[920,400]], crates:[[700,440,32,32]],
    boulders:[[480,200,24],[920,200,24]], seesaws:[[700,440,200]], movingPlatforms:[]
  },

  // ─── TIER 4 (31–40): Expert ────────────────────────────────────────────────
  {
    id:31, name:'Platform Chaos', worldWidth:1600, ink:1000, bg:0,
    start:[80,430], finish:[1520,430],
    platforms:[[180,480,180,30],[460,420,100,20],[660,480,80,20],[820,380,100,20],[1020,480,80,20],[1180,420,100,20],[1380,480,220,30]],
    stars:[[460,390],[820,350],[1180,390]], crates:[], boulders:[[660,200,18]], seesaws:[], movingPlatforms:[]
  },
  {
    id:32, name:'Squeeze', worldWidth:1200, ink:500, bg:3,
    start:[80,450], finish:[1120,450],
    platforms:[[180,490,200,30],[480,490,40,30],[680,490,40,30],[880,490,40,30],[1020,490,240,30]],
    stars:[[480,450],[680,450],[880,450]], crates:[], boulders:[], seesaws:[], movingPlatforms:[]
  },
  {
    id:33, name:'Crate Alley', worldWidth:1100, ink:700, bg:0,
    start:[80,430], finish:[1020,430],
    platforms:[[180,480,280,40],[840,480,280,40]],
    stars:[[560,380]], crates:[[440,460,34,34],[540,460,34,34],[640,460,34,34],[440,425,34,34],[540,425,34,34]],
    boulders:[], seesaws:[], movingPlatforms:[]
  },
  {
    id:34, name:'Stack Attack', worldWidth:1300, ink:800, bg:1,
    start:[80,430], finish:[1220,430],
    platforms:[[180,480,260,40],[1040,480,260,40]],
    stars:[[560,390],[700,360],[840,390]],
    crates:[[560,460,32,32],[560,428,32,32],[700,460,32,32],[700,428,32,32],[700,396,32,32],[840,460,32,32]],
    boulders:[], seesaws:[], movingPlatforms:[]
  },
  {
    id:35, name:'River Crossing', worldWidth:1400, ink:1100, bg:0,
    start:[80,460], finish:[1320,460],
    platforms:[[180,490,200,30],[1220,490,200,30]],
    stars:[[560,430],[700,430],[850,430]], crates:[], boulders:[],
    seesaws:[], movingPlatforms:[[480,470,160,20,0,0,1.4],[700,470,160,20,0,0,1.8],[920,470,160,20,0,0,1.2]]
  },
  {
    id:36, name:'Night Drive', worldWidth:1500, ink:950, bg:2,
    start:[80,430], finish:[1420,430],
    platforms:[[180,480,260,40],[620,480,140,40],[1000,480,140,40],[1320,480,260,40]],
    stars:[[440,420],[760,400],[1080,420]], crates:[], boulders:[[620,200,20],[1000,200,20]],
    seesaws:[], movingPlatforms:[]
  },
  {
    id:37, name:'Sunset Race', worldWidth:1600, ink:1200, bg:1,
    start:[80,430], finish:[1520,430],
    platforms:[[180,480,260,40],[700,460,140,20],[1060,480,140,40],[1360,480,260,40]],
    stars:[[440,430],[820,420],[1200,430]], crates:[[820,440,30,30]],
    boulders:[[500,200,22],[1060,200,20]], seesaws:[], movingPlatforms:[[700,460,140,20,0,0,1.5]]
  },
  {
    id:38, name:'Three Boulders', worldWidth:1300, ink:900, bg:3,
    start:[80,430], finish:[1220,430],
    platforms:[[180,480,280,40],[560,480,120,40],[900,480,120,40],[1120,480,200,40]],
    stars:[[560,420],[740,420],[900,420]],
    crates:[], boulders:[[360,200,25],[720,180,28],[1000,200,22]], seesaws:[], movingPlatforms:[]
  },
  {
    id:39, name:'Moving Targets', worldWidth:1600, ink:800, bg:0,
    start:[80,430], finish:[1520,430],
    platforms:[[180,480,220,40],[1380,480,220,40]],
    stars:[[560,400],[800,380],[1040,400]],
    crates:[], boulders:[],
    seesaws:[], movingPlatforms:[[480,450,180,20,220,0,1.4],[720,450,180,20,180,0,2],[960,450,180,20,200,0,1.7]]
  },
  {
    id:40, name:'Expert Gap', worldWidth:1000, ink:350, bg:2,
    start:[80,430], finish:[920,430],
    platforms:[[180,480,240,40],[760,480,240,40]],
    stars:[[480,400]], crates:[], boulders:[], seesaws:[], movingPlatforms:[]
  },

  // ─── TIER 5 (41–50): Master ────────────────────────────────────────────────
  {
    id:41, name:'Ink Saver', worldWidth:1100, ink:280, bg:1,
    start:[80,430], finish:[1020,430],
    platforms:[[180,480,280,40],[840,480,280,40]],
    stars:[[560,420],[700,400]], crates:[], boulders:[], seesaws:[], movingPlatforms:[]
  },
  {
    id:42, name:'All Stars', worldWidth:1500, ink:800, bg:0,
    start:[80,430], finish:[1420,430],
    platforms:[[180,480,260,40],[600,480,100,40],[900,480,100,40],[1260,480,260,40]],
    stars:[[380,420],[700,410],[900,400],[1060,410],[1320,420]], crates:[], boulders:[], seesaws:[], movingPlatforms:[]
  },
  {
    id:43, name:'The Gauntlet', worldWidth:1800, ink:1100, bg:3,
    start:[80,430], finish:[1720,430],
    platforms:[[180,480,240,40],[620,480,100,40],[980,480,100,40],[1380,480,100,40],[1600,480,220,40]],
    stars:[[400,420],[740,420],[1080,420],[1480,420]],
    crates:[[740,460,32,32],[1080,460,32,32]],
    boulders:[[560,200,20],[940,200,22],[1340,200,20]],
    seesaws:[[1080,440,180]], movingPlatforms:[[1380,450,120,20,120,0,2]]
  },
  {
    id:44, name:'Speed Master', worldWidth:2000, ink:1600, bg:1,
    start:[80,430], finish:[1920,430],
    platforms:[[180,480,300,40],[700,480,200,40],[1100,480,160,40],[1560,480,200,40],[1820,480,260,40]],
    stars:[[440,420],[800,420],[1180,420],[1640,420],[1880,420]],
    crates:[], boulders:[[560,200,18],[1000,200,18],[1480,200,18]], seesaws:[], movingPlatforms:[]
  },
  {
    id:45, name:'Maze Runner', worldWidth:1600, ink:900, bg:3,
    start:[80,480], finish:[1520,480],
    platforms:[[180,510,200,30],[500,420,120,20],[720,510,80,20],[900,380,120,20],[1100,510,80,20],[1280,420,120,20],[1440,510,200,30]],
    stars:[[500,390],[900,350],[1280,390]], crates:[], boulders:[],
    seesaws:[], movingPlatforms:[[720,510,80,20,0,0,0]]
  },
  {
    id:46, name:'Final Sprint', worldWidth:2200, ink:1600, bg:2,
    start:[80,430], finish:[2120,430],
    platforms:[[180,480,300,40],[700,480,180,40],[1060,480,180,40],[1440,480,180,40],[1880,480,340,40]],
    stars:[[440,420],[790,420],[1150,420],[1530,420],[2000,420]],
    crates:[[1060,450,32,32]], boulders:[[880,200,20],[1620,200,22]],
    seesaws:[[1440,440,200]], movingPlatforms:[[700,460,180,20,0,0,1.5]]
  },
  {
    id:47, name:'The Ultimate', worldWidth:1800, ink:1000, bg:3,
    start:[80,430], finish:[1720,430],
    platforms:[[180,480,240,40],[680,480,80,40],[1120,480,80,40],[1560,480,240,40]],
    stars:[[430,420],[720,420],[1000,420],[1320,420],[1650,420]],
    crates:[[720,440,30,30],[1000,440,30,30],[1320,440,30,30]],
    boulders:[[500,200,22],[1240,200,22]],
    seesaws:[[1120,440,180]], movingPlatforms:[[680,450,80,20,100,0,2],[1560,450,80,20,100,0,2]]
  },
  {
    id:48, name:'No Mercy', worldWidth:1600, ink:650, bg:2,
    start:[80,430], finish:[1520,430],
    platforms:[[180,480,220,40],[560,480,60,40],[840,480,60,40],[1120,480,60,40],[1380,480,220,40]],
    stars:[[560,420],[840,420],[1120,420]],
    crates:[], boulders:[[700,200,20],[980,200,20]],
    seesaws:[[840,440,160]], movingPlatforms:[[560,450,60,20,60,0,2.5],[1120,450,60,20,60,0,2.5]]
  },
  {
    id:49, name:'One Last Test', worldWidth:1100, ink:300, bg:1,
    start:[80,450], finish:[1020,450],
    platforms:[[180,490,200,30],[820,490,200,30]],
    stars:[[480,420],[620,400],[760,420]], crates:[], boulders:[],
    seesaws:[], movingPlatforms:[]
  },
  {
    id:50, name:'Grand Finale', worldWidth:2400, ink:1800, bg:2,
    start:[80,430], finish:[2320,430],
    platforms:[[180,480,260,40],[660,460,140,20],[1000,480,100,40],[1340,460,140,20],[1700,480,100,40],[2100,480,100,40],[2220,480,280,40]],
    stars:[[420,420],[800,420],[1080,430],[1420,420],[1800,430],[2160,430],[2300,420]],
    crates:[[1000,450,32,32],[1700,450,32,32]],
    boulders:[[540,200,24],[1240,180,26],[1900,200,22],[2100,200,20]],
    seesaws:[[1340,440,200],[2100,440,180]],
    movingPlatforms:[[660,440,140,20,120,0,1.5],[1340,440,140,20,120,0,2],[1700,440,100,20,80,0,2.5]]
  }
];
