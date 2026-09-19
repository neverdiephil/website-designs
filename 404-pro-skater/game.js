(() => {
  "use strict";

  const root = document.getElementById("game-app");
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const scoreEl = document.getElementById("score");
  const bestEl = document.getElementById("best");
  const startBtn = document.getElementById("start");
  const pauseBtn = document.getElementById("pause");

  if (!ctx) {
    startBtn.disabled = true;
    pauseBtn.disabled = true;
    return;
  }

  const W = canvas.width;
  const H = canvas.height;
  const groundY = 225;

  const COLORS = {
    bg: "#171717",
    ink: "#e6e6e6",
    mid: "#777777",
    faint: "#444444"
  };

  const RAIL_WIDTH = 510;
  const RAIL_HEIGHTS = [24, 28, 32];

  const TRICKS = [
    { id: "spin", name: "360 SPIN" },
    { id: "kickflip", name: "KICKFLIP" },
    { id: "shuvit", name: "POP SHUVIT" }
  ];

  const clouds = [
    { x: 150, y: 72, s: 1 },
    { x: 485, y: 100, s: 0.8 },
    { x: 790, y: 62, s: 1.15 }
  ];

  const pebbles = [
    [20, 6, 2], [68, 18, 2], [117, 9, 2], [166, 21, 3],
    [226, 13, 2], [282, 19, 2], [341, 8, 3], [401, 22, 2],
    [457, 11, 2], [521, 18, 3], [588, 9, 2], [649, 21, 2],
    [714, 12, 2], [776, 20, 3], [833, 10, 2], [872, 17, 2]
  ];

  const player = {
    x: 105,
    y: groundY,
    vy: 0,
    grounded: true,
    grinding: false,
    trick: null,
    trickProgress: 0
  };

  let raf = 0;
  let last = 0;
  let running = false;
  let paused = false;
  let gameOver = false;
  let score = 0;
  let speed = 330;
  let spawnTimer = 0;
  let nextSpawn = 1.35;
  let groundOffset = 0;
  let cloudOffset = 0;
  let trickText = "";
  let trickTimer = 0;
  let grindingRail = null;
  let obstacles = [];

  function readBest() {
    try {
      const value = Number(localStorage.getItem("404-pro-skater-best") || 0);
      return Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
    } catch {
      return 0;
    }
  }

  let best = readBest();

  function saveBest() {
    try {
      localStorage.setItem("404-pro-skater-best", String(best));
    } catch {
      // Storage can be blocked. The game still works without persistence.
    }
  }

  function updateHud() {
    scoreEl.textContent = String(Math.floor(score)).padStart(5, "0");
    bestEl.textContent = String(best).padStart(5, "0");
  }

  function reset() {
    score = 0;
    speed = 330;
    spawnTimer = 0;
    nextSpawn = 1.15;
    groundOffset = 0;
    cloudOffset = 0;
    trickText = "";
    trickTimer = 0;
    grindingRail = null;
    obstacles = [];

    player.y = groundY;
    player.vy = 0;
    player.grounded = true;
    player.grinding = false;
    player.trick = null;
    player.trickProgress = 0;

    gameOver = false;
    paused = false;
    pauseBtn.textContent = "Pause";
    updateHud();
  }

  function start() {
    cancelAnimationFrame(raf);
    reset();
    running = true;
    pauseBtn.disabled = false;
    last = performance.now();
    root.focus({ preventScroll: true });
    raf = requestAnimationFrame(loop);
  }

  function pickRandomTrick() {
    return TRICKS[Math.floor(Math.random() * TRICKS.length)];
  }

  function jump() {
    if (!running || gameOver) {
      start();
      return;
    }

    if (paused || !player.grounded || player.grinding) return;

    player.grounded = false;
    player.vy = -690;
    player.trick = pickRandomTrick();
    player.trickProgress = 0;
    trickText = player.trick.name;
    trickTimer = 0.68;
  }

  function togglePause() {
    if (!running || gameOver) return;

    paused = !paused;
    pauseBtn.textContent = paused ? "Resume" : "Pause";

    if (!paused) {
      last = performance.now();
      raf = requestAnimationFrame(loop);
    } else {
      draw();
    }
  }

  function spawnObstacle() {
    const r = Math.random();

    if (r < 0.22) {
      const height = RAIL_HEIGHTS[Math.floor(Math.random() * RAIL_HEIGHTS.length)];
      obstacles.push({
        type: "rail",
        x: W + 20,
        y: groundY,
        w: RAIL_WIDTH,
        h: height
      });
      return "rail";
    }

    if (r < 0.58) {
      obstacles.push({ type: "smallCactus", x: W + 20, y: groundY, w: 22, h: 44 });
    } else if (r < 0.86) {
      obstacles.push({ type: "bigCactus", x: W + 20, y: groundY, w: 29, h: 58 });
    } else {
      obstacles.push({ type: "doubleCactus", x: W + 20, y: groundY, w: 48, h: 46 });
    }

    return "normal";
  }

  function playerBox() {
    return { x: player.x - 22, y: player.y - 53, w: 44, h: 50 };
  }

  function normalCollision(o) {
    const a = playerBox();
    const b = { x: o.x + 3, y: o.y - o.h + 3, w: o.w - 6, h: o.h - 4 };

    return (
      a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y < b.y + b.h &&
      a.y + a.h > b.y
    );
  }

  function railTop(o) {
    return o.y - o.h;
  }

  function boardDeckY() {
    return player.y - 4;
  }

  function canLandOnRail(o) {
    if (o.type !== "rail" || player.grinding || player.grounded || player.vy <= 0) {
      return false;
    }

    const top = railTop(o);
    const deck = boardDeckY();
    const horizontal = player.x + 17 > o.x && player.x - 17 < o.x + o.w;
    const vertical = deck >= top - 8 && deck <= top + 11;

    return horizontal && vertical;
  }

  function beginGrind(o) {
    player.grinding = true;
    player.grounded = false;
    player.vy = 0;
    player.y = railTop(o) + 4;
    player.trick = null;
    player.trickProgress = 0;
    grindingRail = o;

    trickText = "GRIND!";
    trickTimer = 0.7;
  }

  function endGrind() {
    if (!player.grinding) return;

    player.grinding = false;
    player.vy = 70;
    score += 35;
    trickText = "LONG GRIND +35";
    trickTimer = 0.8;
    grindingRail = null;
  }

  function railSideCollision(o) {
    if (player.grinding && o === grindingRail) return false;

    const a = playerBox();
    const top = railTop(o);
    const horizontal = a.x < o.x + o.w && a.x + a.w > o.x;
    const bodyBottom = a.y + a.h;

    return horizontal && bodyBottom > top + 7 && a.y < o.y;
  }

  function crash() {
    gameOver = true;
    running = false;
    player.grinding = false;
    grindingRail = null;

    best = Math.max(best, Math.floor(score));
    saveBest();
    pauseBtn.disabled = true;
    updateHud();
  }

  function update(dt) {
    score += dt * 10;
    speed = Math.min(650, 330 + score * 1.18);
    groundOffset = (groundOffset + speed * dt) % 48;
    cloudOffset = (cloudOffset + speed * 0.10 * dt) % (W + 200);

    for (const o of obstacles) {
      o.x -= speed * dt;
    }

    if (player.grinding) {
      if (
        grindingRail &&
        player.x >= grindingRail.x - 18 &&
        player.x <= grindingRail.x + grindingRail.w + 18
      ) {
        player.y = railTop(grindingRail) + 4;
        player.vy = 0;
      } else {
        endGrind();
      }
    } else if (!player.grounded) {
      player.vy += 1900 * dt;
      player.y += player.vy * dt;
      player.trickProgress = Math.min(1, player.trickProgress + dt / 0.72);

      let landedOnRail = false;

      for (const o of obstacles) {
        if (canLandOnRail(o)) {
          beginGrind(o);
          landedOnRail = true;
          break;
        }
      }

      if (!landedOnRail && player.y >= groundY) {
        player.y = groundY;
        player.vy = 0;
        player.grounded = true;
        player.trickProgress = 1;

        if (player.trick) {
          score += 15;
          trickText = player.trick.name + " +15";
          trickTimer = 0.7;
        }

        player.trick = null;
      }
    }

    if (trickTimer > 0) trickTimer -= dt;

    spawnTimer += dt;

    if (spawnTimer >= nextSpawn) {
      spawnTimer = 0;
      const spawned = spawnObstacle();

      nextSpawn = spawned === "rail"
        ? 2.25 + Math.random() * 0.45
        : Math.max(0.78, 1.5 - (speed - 330) / 1000) + Math.random() * 0.5;
    }

    obstacles = obstacles.filter((o) => o.x + o.w > -30);

    for (const o of obstacles) {
      if (o.type === "rail") {
        if (!canLandOnRail(o) && railSideCollision(o)) {
          crash();
          break;
        }
      } else if (normalCollision(o)) {
        crash();
        break;
      }
    }

    if (Math.floor(score) > best) {
      best = Math.floor(score);
    }

    updateHud();
  }

  function px(x, y, w, h, color = COLORS.ink) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  function drawCloud(x, y, s = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.strokeStyle = COLORS.faint;
    ctx.lineWidth = 3;
    ctx.lineJoin = "miter";
    ctx.beginPath();
    ctx.moveTo(0, 18);
    ctx.lineTo(10, 18);
    ctx.lineTo(10, 12);
    ctx.lineTo(18, 12);
    ctx.lineTo(18, 7);
    ctx.lineTo(30, 7);
    ctx.lineTo(30, 2);
    ctx.lineTo(43, 2);
    ctx.lineTo(43, 7);
    ctx.lineTo(55, 7);
    ctx.lineTo(55, 12);
    ctx.lineTo(70, 12);
    ctx.lineTo(70, 18);
    ctx.lineTo(0, 18);
    ctx.stroke();
    ctx.restore();
  }

  function drawSky() {
    for (const c of clouds) {
      let x = c.x - cloudOffset;
      while (x < -100) x += W + 220;
      drawCloud(x, c.y, c.s);
    }
  }

  function drawGround() {
    ctx.strokeStyle = COLORS.ink;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, groundY + 8);
    ctx.lineTo(W, groundY + 8);
    ctx.stroke();

    for (const p of pebbles) {
      let x = p[0] - groundOffset;
      while (x < -20) x += W;
      px(x, groundY + p[1], p[2] * 3, 2, COLORS.mid);
    }

    for (let x = -groundOffset; x < W; x += 96) {
      px(x + 18, groundY + 14, 3, 2, COLORS.mid);
      px(x + 62, groundY + 24, 6, 2, COLORS.mid);
    }
  }

  function drawBoard(angle = 0, flip = 1) {
    ctx.save();
    ctx.translate(0, 23);
    ctx.rotate(angle);
    ctx.scale(1, flip);

    px(-24, -2, 48, 4);
    px(-18, -5, 36, 3);
    px(-19, 3, 6, 6);
    px(13, 3, 6, 6);

    ctx.restore();
  }

  function drawDinoBody() {
    px(-31, -7, 8, 6);
    px(-27, -11, 8, 7);
    px(-22, -15, 8, 8);

    px(-18, -24, 28, 28);
    px(-12, -31, 20, 14);

    px(2, -41, 10, 24);
    px(7, -52, 28, 22);
    px(14, -57, 21, 8);
    px(29, -45, 9, 9);

    px(25, -38, 13, 5, COLORS.bg);
    px(28, -51, 4, 4, COLORS.bg);

    px(7, -20, 11, 5);
    px(14, -17, 5, 8);

    // Static legs / feet.
    px(-12, 2, 7, 16);
    px(-12, 14, 12, 6);
    px(5, 1, 7, 17);
    px(5, 14, 13, 6);
  }

  function drawPlayer() {
    const p = player.trickProgress;
    let bodyAngle = 0;
    let boardAngle = 0;
    let boardFlip = 1;

    if (!player.grounded && !player.grinding && player.trick) {
      if (player.trick.id === "spin") {
        bodyAngle = p * Math.PI * 2;
      }

      if (player.trick.id === "kickflip") {
        bodyAngle = Math.sin(p * Math.PI) * 0.10;
        boardFlip = Math.cos(p * Math.PI * 2);
      }

      if (player.trick.id === "shuvit") {
        bodyAngle = Math.sin(p * Math.PI) * -0.08;
        boardAngle = p * Math.PI * 2;
      }
    }

    ctx.save();
    ctx.translate(player.x, player.y - 25);
    ctx.rotate(player.grinding ? -0.04 : bodyAngle);
    drawDinoBody();
    drawBoard(boardAngle, boardFlip);
    ctx.restore();
  }

  function drawCactusSingle(x, y, scale = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    px(10, -44, 10, 44);
    px(7, -48, 16, 7);
    px(0, -31, 8, 17);
    px(0, -31, 5, -10);
    px(3, -44, 5, 7);
    px(22, -25, 8, 15);
    px(26, -35, 5, 10);
    px(23, -38, 8, 5);

    ctx.restore();
  }

  function drawRail(o) {
    const top = o.y - o.h;

    px(o.x, top, o.w, 5);
    px(o.x + 4, top - 2, o.w - 8, 2, COLORS.mid);

    const supportSpacing = 82;

    for (let sx = o.x + 18; sx < o.x + o.w - 10; sx += supportSpacing) {
      px(sx, top + 4, 5, o.h - 4);
      px(sx - 7, o.y - 3, 19, 3);
    }

    px(o.x, top - 2, 6, 7);
    px(o.x + o.w - 6, top - 2, 6, 7);
  }

  function drawObstacle(o) {
    if (o.type === "rail") {
      drawRail(o);
    } else if (o.type === "smallCactus") {
      drawCactusSingle(o.x, o.y, 0.86);
    } else if (o.type === "bigCactus") {
      drawCactusSingle(o.x, o.y, 1.13);
    } else {
      drawCactusSingle(o.x, o.y, 0.88);
      drawCactusSingle(o.x + 23, o.y, 0.96);
    }
  }

  function text(str, x, y, size = 18, align = "center") {
    ctx.save();
    ctx.fillStyle = COLORS.ink;
    ctx.font = `700 ${size}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
    ctx.textAlign = align;
    ctx.fillText(str, x, y);
    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, W, H);

    drawSky();
    drawGround();

    for (const o of obstacles) {
      drawObstacle(o);
    }

    drawPlayer();

    if (trickTimer > 0) {
      text(trickText, player.x, player.y - 92, 15);
    }

    if (!running && !gameOver) {
      text("404 PRO SKATER", W / 2, 105, 25);
      text("press space or tap to skate", W / 2, 136, 14);
    }

    if (paused) {
      ctx.fillStyle = "rgba(23,23,23,.88)";
      ctx.fillRect(0, 0, W, H);
      text("PAUSED", W / 2, H / 2, 23);
    }

    if (gameOver) {
      ctx.fillStyle = "rgba(23,23,23,.90)";
      ctx.fillRect(0, 0, W, H);
      text("G A M E  O V E R", W / 2, 115, 22);
      text("tap or press space to retry", W / 2, 148, 14);
    }
  }

  function loop(now) {
    if (!running || paused) {
      draw();
      return;
    }

    const dt = Math.min(0.033, (now - last) / 1000 || 0);
    last = now;

    update(dt);
    draw();

    if (running && !paused) {
      raf = requestAnimationFrame(loop);
    }
  }

  startBtn.addEventListener("click", start);
  pauseBtn.addEventListener("click", togglePause);
  canvas.addEventListener("pointerdown", jump);

  root.addEventListener("keydown", (event) => {
    if (event.target.matches("input, textarea, select, button")) return;

    if (event.code === "Space" || event.code === "ArrowUp") {
      event.preventDefault();
      jump();
    }

    if (event.code === "KeyP") {
      event.preventDefault();
      togglePause();
    }
  });

  window.addEventListener("blur", () => {
    if (running && !paused && !gameOver) {
      paused = true;
      pauseBtn.textContent = "Resume";
      draw();
    }
  });

  updateHud();
  draw();
})();
