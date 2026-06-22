// =====================================================
// V45
// 
// 點擊 / 觸碰：切換圖片｜S：儲存
// =====================================================

let imgFiles = [ "Image1.png","Image2.png","Image3.png","Image4.png","Image5.png","Image6.png","Image7.png","Image8.png","Image9.png","Image10.png","Image11.png","Image12.png","Image13.png","Image14.png","Image15.png","Image16.png","Image17.png","Image18.png","Image19.png","Image20.png","Image21.png"];

let imgs = [];
let currentImg;
let currentIndex = 0;
let cover;

let colorGroups = [];
let anchors = [];

let backgroundMist = [];
let mistClouds = [];
let haloRings = [];
let coreGlowClouds = [];
let preCoreCircles = [];
let ribbons = [];
let dotRibbons = [];
let airyLines = [];

let progress = 0;
let progressSpeed = 0.0040;
let generationSeed = 0;
let lastTouchTime = 0;

let sceneStartTime = 0;
let introHoldTime = 2000;
let introFadeTime = 3500;

let autoSwitchTriggered = false;

function preload() {
  for (let i = 0; i < imgFiles.length; i++) {
    imgs[i] = loadImage(imgFiles[i]);
  }
}

function setup() {
	//原本1280X690
	background(0);
	createCanvas(1340, 770);
  pixelDensity(1);
  frameRate(60);
	
	currentImg = imgs[currentIndex];
generateNew();
sceneStartTime = millis();
}

function draw() {
	

  let elapsed = millis() - sceneStartTime;

  if (elapsed < introHoldTime) {

    image(currentImg, cover.x, cover.y, cover.w, cover.h);
    return;

  }

  let fadeP = constrain(
    (elapsed - introHoldTime) / introFadeTime,
    0,
    1
  );

  if (fadeP >= 1) {
    progress = constrain(progress + progressSpeed, 0, 1);
  }

  background(18, 21, 36);

  drawFullImageMist();
  drawBackgroundMist();
  drawMistClouds();

  drawCoreGlowClouds();
  drawPreCoreCircles();
  drawHaloRings();

  drawRibbons();
  drawDotRibbons();
  drawAiryLines();


if (
    (progress >= 1 || elapsed > 120000) &&
    !autoSwitchTriggered
) {

    autoSwitchTriggered = true;

    setTimeout(() => {

        switchImage();

    }, 1500);

}
  let imageAlpha = map(fadeP, 0, 1, 255, 0);

  push();
  tint(255, imageAlpha);
  image(currentImg, cover.x, cover.y, cover.w, cover.h);
  pop();

}

// =====================================================
// Generate
// =====================================================

function generateNew() {
  generationSeed = random(999999);
  randomSeed(generationSeed);
  noiseSeed(generationSeed);

  progress = 0;
	autoSwitchTriggered = false;
  currentImg.loadPixels();
  cover = getCoverInfo(currentImg);

  colorGroups = [];
  anchors = [];

  backgroundMist = [];
  mistClouds = [];
  haloRings = [];
  coreGlowClouds = [];
  preCoreCircles = [];
  ribbons = [];
  dotRibbons = [];
  airyLines = [];
	
ribbonsGenerated = false;
detailsGenerated = false;
  analyzeColorGroups();
  analyzeAnchorsV4();

createBackgroundMist();
createMistClouds();

createCoreGlowClouds();
createPreCoreCircles();

createHaloRings();

createRibbons();
createDotRibbons();
createAiryLines();
}

// =====================================================
// 色彩分析
// =====================================================

function analyzeColorGroups() {
  let buckets = {};

  for (let y = 0; y < currentImg.height; y += 5) {
    for (let x = 0; x < currentImg.width; x += 5) {

      let c = getImagePixel(x, y);
      if (!c) continue;

      let b = brightnessOf(c);
      let s = saturationOf(c);

      if (b < 20) continue;

      let qr = floor(red(c) / 32) * 32;
      let qg = floor(green(c) / 32) * 32;
      let qb = floor(blue(c) / 32) * 32;
      let key = qr + "_" + qg + "_" + qb;

      let colorBoost = s > 60 ? 2.8 :
                       s > 38 ? 2.1 :
                       s > 22 ? 1.25 : 0.75;

      let brightBoost = b > 180 ? 1.35 :
                        b > 110 ? 1.15 : 0.9;

      let whiteBoost = isWhiteLike(c) ? 0.35 : 1.0;

      let w =
        (1 + b / 130 + s / 38) *
        colorBoost *
        brightBoost *
        whiteBoost;

      if (!buckets[key]) {
        buckets[key] = {
          r: 0,
          g: 0,
          b: 0,
          w: 0,
          pts: []
        };
      }

      let boosted = boostColorStrong(c);

      buckets[key].r += red(boosted) * w;
      buckets[key].g += green(boosted) * w;
      buckets[key].b += blue(boosted) * w;
      buckets[key].w += w;

      buckets[key].pts.push({
        x: cover.x + map(x, 0, currentImg.width, 0, cover.w),
        y: cover.y + map(y, 0, currentImg.height, 0, cover.h),
        c: boosted,
        w: w
      });
    }
  }

  let arr = [];

  for (let key in buckets) {
    let item = buckets[key];
    if (item.w <= 0 || item.pts.length < 8) continue;

    arr.push({
      c: color(
        item.r / item.w,
        item.g / item.w,
        item.b / item.w
      ),
      weight: item.w,
      pts: item.pts
    });
  }

  arr.sort((a, b) => b.weight - a.weight);

  colorGroups = arr.slice(0, 10);

  let sum = 0;
  for (let g of colorGroups) sum += g.weight;

  for (let g of colorGroups) {
    g.ratio = g.weight / max(1, sum);
  }

  if (colorGroups.length === 0) {
    colorGroups = [
      { c: color(255, 210, 80), ratio: 0.34, pts: [] },
      { c: color(255, 70, 120), ratio: 0.33, pts: [] },
      { c: color(80, 160, 255), ratio: 0.33, pts: [] }
    ];
  }
}

function boostColorStrong(c) {
  let r = red(c);
  let g = green(c);
  let b = blue(c);

  let avg = (r + g + b) / 3;

  let satBoost = 1.85;
  let brightBoost = 1.12;

  if (isWhiteLike(c)) {
    satBoost = 1.15;
    brightBoost = 1.02;
  }

  return color(
    constrain((avg + (r - avg) * satBoost) * brightBoost, 0, 255),
    constrain((avg + (g - avg) * satBoost) * brightBoost, 0, 255),
    constrain((avg + (b - avg) * satBoost) * brightBoost, 0, 255)
  );
}

function pickWeightedGroup() {
  let r = random();
  let sum = 0;

  for (let g of colorGroups) {
    sum += g.ratio;
    if (r <= sum) return g;
  }

  return colorGroups[0];
}

function pickWeightedColor() {
  return boostColorStrong(pickWeightedGroup().c);
}
// =====================================================
// V4 核心偵測
// =====================================================

function analyzeAnchorsV4() {
  let cols = 10;
  let rows = 6;
  let cells = [];

  for (let gy = 0; gy < rows; gy++) {
    for (let gx = 0; gx < cols; gx++) {
      cells.push({
        sx: 0,
        sy: 0,
        weight: 0,
        r: 0,
        g: 0,
        b: 0,
        score: 0,
        count: 0
      });
    }
  }

  for (let y = 0; y < currentImg.height; y += 5) {
    for (let x = 0; x < currentImg.width; x += 5) {
      let c = getImagePixel(x, y);
      if (!c) continue;

      let b = brightnessOf(c);
      let s = saturationOf(c);
      let edge = imageEdgeScore(x, y, 5);

      let w = b * 0.42 + s * 1.65 + edge * 1.55;
      if (w < 88) continue;

      let gx = floor(map(x, 0, currentImg.width, 0, cols));
      let gy = floor(map(y, 0, currentImg.height, 0, rows));

      gx = constrain(gx, 0, cols - 1);
      gy = constrain(gy, 0, rows - 1);

      let cell = cells[gx + gy * cols];

      cell.sx += x * w;
      cell.sy += y * w;
      cell.weight += w;
      cell.score += w;
      cell.count++;

      cell.r += red(c) * w;
      cell.g += green(c) * w;
      cell.b += blue(c) * w;
    }
  }

  cells.sort((a, b) => b.score - a.score);

  let validCells = cells.filter(c => c.weight > 0);
  let maxAnchors = constrain(floor(validCells.length * 0.24), 4, 10);

  for (let i = 0; i < cells.length; i++) {
    let cell = cells[i];
    if (cell.weight <= 0) continue;

    let imgX = cell.sx / cell.weight;
    let imgY = cell.sy / cell.weight;

    let x = cover.x + map(imgX, 0, currentImg.width, 0, cover.w);
    let y = cover.y + map(imgY, 0, currentImg.height, 0, cover.h);

    let baseColor = color(
      cell.r / cell.weight,
      cell.g / cell.weight,
      cell.b / cell.weight
    );

    let radius = map(cell.count, 1, 150, 75, 280);
    radius *= constrain(cell.score / 90000, 0.45, 1.55);
    radius = constrain(radius, 90, 330);

    let tooClose = false;
    for (let a of anchors) {
      if (dist(x, y, a.x, a.y) < (radius + a.radius) * 0.42) {
        tooClose = true;
        break;
      }
    }

    if (!tooClose) {
      let localGroup = nearestColorGroup(baseColor);

      anchors.push({
        x: x + randomGaussian(0, 12),
        y: y + randomGaussian(0, 12),
        c: boostColor(baseColor),
        group: localGroup,
        radius: radius,
        phase: random(TWO_PI),
        strength: cell.score
      });
    }

    if (anchors.length >= maxAnchors) break;
  }

  if (anchors.length === 0) {
    let g = pickWeightedGroup();

    anchors.push({
      x: width / 2,
      y: height / 2,
      c: boostColor(g.c),
      group: g,
      radius: 240,
      phase: random(TWO_PI),
      strength: 1
    });
  }
}

function nearestColorGroup(c) {
  let best = colorGroups[0];
  let bestD = 999999;

  for (let g of colorGroups) {
    let d = colorDistance(c, g.c);
    if (d < bestD) {
      bestD = d;
      best = g;
    }
  }

  return best;
}

// =====================================================
// 背景霧化
// =====================================================

function createBackgroundMist() {
  let count = 220;

  for (let i = 0; i < count; i++) {
    let g = pickWeightedGroup();
    let c = boostColor(g.c);

    backgroundMist.push({
      x: random(width),
      y: random(height),
      w: random(260, 940),
      h: random(160, 560),
      c: c,
      alpha: isWhiteLike(c) ? random(0.65, 2.0) : random(1.7, 5.2),
      rot: random(TWO_PI),
      delay: random(0.0, 0.45),
      drift: random(1000)
    });
  }
}

function createMistClouds() {
  let count = 450;

  for (let i = 0; i < count; i++) {
    let a = random(anchors);
    if (!a) continue;

    let ang = random(TWO_PI);
    let rr = random(a.radius * 0.25, a.radius * 3.4);

    let x = a.x + cos(ang) * rr + randomGaussian(0, 90);
    let y = a.y + sin(ang) * rr + randomGaussian(0, 80);

    let c = random() < 0.82 ? a.c : boostColor(pickWeightedColor());

    mistClouds.push({
      x: x,
      y: y,
      w: random(120, 420),
      h: random(70, 240),
      c: c,
      alpha: isWhiteLike(c) ? random(0.4, 2.0) : random(3.4, 6.2),
      rot: random(TWO_PI),
      delay: random(0.02, 0.55),
      drift: random(1000)
    });
  }
}

// =====================================================
// 核心模糊光暈：越外圈越模糊
// =====================================================

function createCoreGlowClouds() {
  for (let a of anchors) {
    let count = floor(random(4, 6));

    for (let i = 0; i < count; i++) {
      coreGlowClouds.push({
        x: a.x + randomGaussian(0, 8),
        y: a.y + randomGaussian(0, 8),
        r: a.radius * random(0.6, 1.3),
        c: random() < 0.82 ? a.c : boostColor(pickWeightedColor()),
        alpha: isWhiteLike(a.c) ? random(17, 27) : random(27, 51),
        delay: random(0.0, 0.32),
        phase: random(TWO_PI)
      });
    }
  }
}

// =====================================================
// 彩帶出現前核心圓層
// =====================================================

function createPreCoreCircles() {
  for (let a of anchors) {
    let count = floor(random(16, 30));

    for (let i = 0; i < count; i++) {
      let angle = random(TWO_PI);
      let rr = random(a.radius * 0.12, a.radius * 1.2);

      preCoreCircles.push({
        x: a.x + cos(angle) * rr + randomGaussian(0, 10),
        y: a.y + sin(angle) * rr + randomGaussian(0, 10),
        r: random(8, 52) * random(0.55, 1.7),
        c: random() < 0.75 ? a.c : boostColor(pickWeightedColor()),
        alpha: isWhiteLike(a.c) ? random(20, 36) : random(32, 64),
        delay: random(0.02, 0.34),
        phase: random(TWO_PI)
      });
    }
  }
}

// =====================================================
// 光環
// =====================================================

function createHaloRings() {
  for (let a of anchors) {
    let count = floor(random(10, 18));

    for (let i = 0; i < count; i++) {
      let c = random() < 0.84 ? a.c : boostColor(pickWeightedColor());

      haloRings.push({
        x: a.x + randomGaussian(0, 16),
        y: a.y + randomGaussian(0, 16),
        r: a.radius * random(0.5, 2.45),
        c: c,
        alpha: isWhiteLike(c) ? random(30, 50) : random(41, 67),
        weight: random(0.45, 1.6),
        delay: random(0.08, 0.62),
        phase: random(TWO_PI)
      });
    }
  }
}

// =====================================================
// 70% 平滑彩帶：減少後約165條
// =====================================================

function createRibbons() {
  let total = 200;

  for (let i = 0; i < total; i++) {
    let a = random(anchors);
    if (!a) continue;

    let typeRand = random();
    let isMain = typeRand < 0.28;
    let isMid = typeRand >= 0.28 && typeRand < 0.68;

    let startAngle = random(TWO_PI);
    let startRadius = random(a.radius * 0.25, a.radius * 0.9);

    let arcSweep = random([-1, 1]) * random(0.55, 1.45);
    let radialGrow = isMain ? random(220, 520) : isMid ? random(160, 420) : random(110, 300);

    let p0 = pointAroundAnchor(a, startAngle, startRadius);
    let p3 = pointAroundAnchor(a, startAngle + arcSweep, startRadius + radialGrow);

    let p1 = pointAroundAnchor(a, startAngle + arcSweep * 0.32, startRadius + radialGrow * 0.32);
    let p2 = pointAroundAnchor(a, startAngle + arcSweep * 0.68, startRadius + radialGrow * 0.68);

    let c1 = random() < 0.78 ? a.c : boostColor(pickWeightedColor());
    let c2 = random() < 0.78 ? shiftWithinSameColorFamily(c1) : boostColor(a.group.c);

    ribbons.push({
      p0,
      p1,
      p2,
      p3,
      c1,
      c2,
      width: isMain ? random(24,58)
              : isMid ? random(15,38)
              : random(8,22),
      alpha: isWhiteLike(c1) ? (isMain ? random(160,220)  : random(190,240)) : (isMain ? random(220,250)   : random(220,255)),
      glowAlpha: isWhiteLike(c1)  ? random(18,35) : random(25,50),
      delay: random(0.28, 0.88),
      speed: random(0.85, 1.45)
    });
  }
}

// =====================================================
// 30% 圓點彩帶：約70條，圓點不重疊
// =====================================================

function createDotRibbons() {
  let total = 55;

  for (let i = 0; i < total; i++) {
    let a = random(anchors);
    if (!a) continue;

    let startAngle = random(TWO_PI);
    let startRadius = random(a.radius * 0.22, a.radius * 0.9);

    let arcSweep = random([-1, 1]) * random(0.65, 1.45);
    let radialGrow = random(160, 460);

    let p0 = pointAroundAnchor(a, startAngle, startRadius);
    let p3 = pointAroundAnchor(a, startAngle + arcSweep, startRadius + radialGrow);
    let p1 = pointAroundAnchor(a, startAngle + arcSweep * 0.32, startRadius + radialGrow * 0.35);
    let p2 = pointAroundAnchor(a, startAngle + arcSweep * 0.68, startRadius + radialGrow * 0.7);

    let dotSize = random(7, 16);
    let spacing = dotSize * random(1.45, 1.9);
    let estimatedLen = dist(p0.x, p0.y, p3.x, p3.y);
    let steps = floor(constrain(estimatedLen / spacing, 10, 36));

    let c1 = random() < 0.82 ? a.c : boostColor(pickWeightedColor());
    let c2 = shiftWithinSameColorFamily(c1);

    dotRibbons.push({
      p0,
      p1,
      p2,
      p3,
      c1,
      c2,
      dotSize,
      steps,
      alpha: isWhiteLike(c1) ? random(25, 55) : random(55, 110),
      glowAlpha: isWhiteLike(c1) ? random(8, 18) : random(18, 38),
      delay: random(0.18, 0.82),
      speed: random(0.85, 1.35)
    });
  }
}

function pointAroundAnchor(a, ang, r) {
  return createVector(a.x + cos(ang) * r, a.y + sin(ang) * r);
}

// =====================================================
// 飄逸細線
// =====================================================

function createAiryLines() {
  let total = 440;

  for (let i = 0; i < total; i++) {
    let rb = random(ribbons);
    if (!rb) continue;

    let t0 = random(0.08, 0.72);
    let base = ribbonPoint(rb, t0);
    let tangent = ribbonTangent(rb, t0);

    let len = random(100, 260);
    let side = tangent + random([-1, 1]) * random(0.12, 0.45);

    let p0 = createVector(base.x, base.y);
    let p3 = createVector(base.x + cos(side) * len, base.y + sin(side) * len);

    let side2 = side + HALF_PI;
    let bend = random([-1, 1]) * random(30, 100);

    let p1 = createVector(
      p0.x + cos(side) * len * 0.35 + cos(side2) * bend * 0.4,
      p0.y + sin(side) * len * 0.35 + sin(side2) * bend * 0.4
    );

    let p2 = createVector(
      p0.x + cos(side) * len * 0.7 - cos(side2) * bend * 0.35,
      p0.y + sin(side) * len * 0.7 - sin(side2) * bend * 0.35
    );

    airyLines.push({
      p0,
      p1,
      p2,
      p3,
      c: lerpColor(rb.c1, rb.c2, t0),
      alpha: isWhiteLike(rb.c1) ? random(225, 248) : random(232, 255),
      weight: random(1.45, 2.25),
      delay: rb.delay + random(0.05, 0.38),
      speed: random(0.65, 1.1)
    });
  }
}

// =====================================================
// Draw：全圖大量模糊霧化
// =====================================================

function drawFullImageMist() {
  push();
  blendMode(SCREEN);

  let p = progress;

  let imageAlpha = map(p, 0, 1, 58, 1.5);
  let blurAmount = map(p,0,1,4,22);
  let spread = map(p, 0, 1, 20, 190);
  let scaleSpread = map(p, 0, 1, 1.04, 1.42);

  drawingContext.filter = "blur(" + blurAmount + "px)";
  tint(255, imageAlpha);
  image(currentImg, cover.x, cover.y, cover.w, cover.h);
	//霧化層數
  let layers = 18;

  for (let i = 0; i < layers; i++) {
    let t = i / max(1, layers - 1);

    let sc = lerp(1.0, scaleSpread, t);
    let alpha = map(t, 0, 1, 28, 1.8) * p;

    let ox = (noise(i * 0.36, generationSeed * 0.002) * 2 - 1) * spread * t;
    let oy = (noise(i * 0.48 + 100, generationSeed * 0.002) * 2 - 1) * spread * t;

    drawingContext.filter = "blur(" + (blurAmount + t * 34) + "px)";
    tint(255, alpha);

    image(
      currentImg,
      cover.x + ox - (cover.w * (sc - 1)) / 2,
      cover.y + oy - (cover.h * (sc - 1)) / 2,
      cover.w * sc,
      cover.h * sc
    );
  }

  drawingContext.filter = "none";
  pop();

  blendMode(BLEND);
}

function drawBackgroundMist() {
  blendMode(SCREEN);
  noStroke();

  for (let m of backgroundMist) {
    let p = easeOutCubic(constrain((progress - m.delay) / 0.9, 0, 1));
    if (p <= 0) continue;

    let dx = map(noise(m.drift, frameCount * 0.001), 0, 1, -2, 2);
    let dy = map(noise(m.drift + 70, frameCount * 0.001), 0, 1, -2, 2);

    push();
    translate(m.x + dx, m.y + dy);
    rotate(m.rot);
    fill(red(m.c), green(m.c), blue(m.c), m.alpha * p);
    ellipse(0, 0, m.w, m.h);
    pop();
  }

  blendMode(BLEND);
}

function drawMistClouds() {
  blendMode(SCREEN);
  noStroke();

  for (let m of mistClouds) {
    let p = easeOutCubic(constrain((progress - m.delay) / 0.9, 0, 1));
    if (p <= 0) continue;

    let dx = map(noise(m.drift, frameCount * 0.001), 0, 1, -1.5, 1.5);
    let dy = map(noise(m.drift + 80, frameCount * 0.001), 0, 1, -1.5, 1.5);

    push();
    translate(m.x + dx, m.y + dy);
    rotate(m.rot);

    for (let i = 8; i >= 1; i--) {
      let t = i / 8;
      fill(red(m.c), green(m.c), blue(m.c), m.alpha * p * (1 - t * 0.45));
      ellipse(0, 0, m.w * t, m.h * t);
    }

    pop();
  }

  blendMode(BLEND);
}

function drawCoreGlowClouds() {
  blendMode(SCREEN);
  noStroke();

  for (let cg of coreGlowClouds) {
    let p = easeOutCubic(constrain((progress - cg.delay) / 0.7, 0, 1));
    if (p <= 0) continue;

    let pulse = sin(frameCount * 0.006 + cg.phase) * 0.5 + 0.5;
    let baseR = cg.r * p * (0.96 + pulse * 0.05);

    for (let i = 5; i >= 1; i--) {
      let t = i / 5;
      let blurAmount = map(i, 1, 5, 1, 16);

      drawingContext.filter = "blur(" + blurAmount + "px)";
      fill(red(cg.c), green(cg.c), blue(cg.c), cg.alpha * p * (1 - t * 0.65));

      ellipse(cg.x, cg.y, baseR * t * 2, baseR * t * 2);
    }

    drawingContext.filter = "none";
  }

  blendMode(BLEND);
}

function drawPreCoreCircles() {
  blendMode(SCREEN);
  noStroke();

  for (let pc of preCoreCircles) {
    let p = easeOutCubic(constrain((progress - pc.delay) / 0.45, 0, 1));
    if (p <= 0) continue;

    let pulse = sin(frameCount * 0.01 + pc.phase) * 0.5 + 0.5;
    let a = pc.alpha * p * (0.7 + pulse * 0.3);

    fill(red(pc.c), green(pc.c), blue(pc.c), a * 0.28);
    ellipse(pc.x, pc.y, pc.r * 2.8, pc.r * 2.8);

    fill(red(pc.c), green(pc.c), blue(pc.c), a);
    ellipse(pc.x, pc.y, pc.r, pc.r);
  }

  blendMode(BLEND);
}

function drawHaloRings() {
  blendMode(SCREEN);
  noFill();

  for (let h of haloRings) {
    let p = easeOutCubic(constrain((progress - h.delay) / 0.9, 0, 1));
    if (p <= 0) continue;

    let rr = h.r * p;

    stroke(red(h.c), green(h.c), blue(h.c), h.alpha * p);
    strokeWeight(h.weight);
    ellipse(h.x, h.y, rr, rr);

    drawingContext.filter = "blur(4px)";
    stroke(red(h.c), green(h.c), blue(h.c), h.alpha * 0.25 * p);
    strokeWeight(h.weight * 3.4);
    ellipse(h.x, h.y, rr * 0.75, rr * 0.75);
    drawingContext.filter = "none";
  }

  blendMode(BLEND);
}

function drawRibbons() {
  blendMode(SCREEN);
  noStroke();

  for (let rb of ribbons) {
    let p = easeOutCubic(constrain((progress - rb.delay) / rb.speed, 0, 1));
    if (p <= 0) continue;

    drawingContext.filter = "blur(3px)";
    drawBezierRibbon(rb, p, rb.width * 2.35, rb.glowAlpha * p, true);

    drawingContext.filter = "blur(1.4px)";
    drawBezierRibbon(rb, p, rb.width, rb.alpha * p, false);

    drawingContext.filter = "none";
  }

  blendMode(BLEND);
}

function drawDotRibbons() {
  blendMode(SCREEN);
  noStroke();

  for (let dr of dotRibbons) {
    let p = easeOutCubic(constrain((progress - dr.delay) / dr.speed, 0, 1));
    if (p <= 0) continue;

    let visible = floor(dr.steps * p);

    for (let i = 0; i < visible; i++) {
      let t = i / max(1, dr.steps - 1);

      let x = bezierPoint(dr.p0.x, dr.p1.x, dr.p2.x, dr.p3.x, t);
      let y = bezierPoint(dr.p0.y, dr.p1.y, dr.p2.y, dr.p3.y, t);

      let c = lerpColor(dr.c1, dr.c2, t);
      let tailFade = pow(1 - t, 0.85);

      fill(red(c), green(c), blue(c), dr.glowAlpha * tailFade);
      ellipse(x, y, dr.dotSize * 2.4, dr.dotSize * 2.4);

      fill(red(c), green(c), blue(c), dr.alpha * 0.42 * tailFade);
      ellipse(x, y, dr.dotSize * 1.35, dr.dotSize * 1.35);

      fill(red(c), green(c), blue(c), dr.alpha * tailFade);
      ellipse(x, y, dr.dotSize, dr.dotSize);
    }
  }

  blendMode(BLEND);
}

function drawBezierRibbon(rb, visibleP, baseW, baseA, glowMode) {
  let steps = 90;
  let visibleSteps = floor(steps * visibleP);

  for (let i = 0; i < visibleSteps - 1; i++) {
    let t1 = i / steps;
    let t2 = (i + 1) / steps;

    let p1 = ribbonPoint(rb, t1);
    let p2 = ribbonPoint(rb, t2);

    let angle = atan2(p2.y - p1.y, p2.x - p1.x);
    let nx = cos(angle + HALF_PI);
    let ny = sin(angle + HALF_PI);

    let shapeW = 0.55 + 0.45 * sin(t1 * PI);
    let w = baseW * shapeW;

    let c = lerpColor(rb.c1, rb.c2, t1);
    let tailFade = pow(1 - t1, 0.85);
    let a = baseA * (0.9 + 0.35 * sin(t1 * PI)) * tailFade;

    if (glowMode) a *= 0.42;

    fill(red(c), green(c), blue(c), a);

    beginShape();
    vertex(p1.x + nx * w * 0.5, p1.y + ny * w * 0.5);
    vertex(p1.x - nx * w * 0.5, p1.y - ny * w * 0.5);
    vertex(p2.x - nx * w * 0.5, p2.y - ny * w * 0.5);
    vertex(p2.x + nx * w * 0.5, p2.y + ny * w * 0.5);
    endShape(CLOSE);
  }
}

function drawAiryLines() {
  blendMode(SCREEN);
  noFill();

  for (let ln of airyLines) {
    let p = easeOutCubic(constrain((progress - ln.delay) / ln.speed, 0, 1));
    if (p <= 0) continue;

    let steps = 48;
    let visible = floor(steps * p);
    if (visible < 3) continue;

    stroke(red(ln.c), green(ln.c), blue(ln.c), ln.alpha * p);
    strokeWeight(ln.weight);

    beginShape();

    for (let i = 0; i < visible; i++) {
      let t = i / steps;
      let tailFade = pow(1 - t, 1.1);

      let x = bezierPoint(ln.p0.x, ln.p1.x, ln.p2.x, ln.p3.x, t);
      let y = bezierPoint(ln.p0.y, ln.p1.y, ln.p2.y, ln.p3.y, t);

      stroke(red(ln.c), green(ln.c), blue(ln.c), ln.alpha * p * tailFade);
      curveVertex(x, y);
    }

    endShape();
  }

  blendMode(BLEND);
}

// =====================================================
// Bezier Tools
// =====================================================

function ribbonPoint(rb, t) {
  return createVector(
    bezierPoint(rb.p0.x, rb.p1.x, rb.p2.x, rb.p3.x, t),
    bezierPoint(rb.p0.y, rb.p1.y, rb.p2.y, rb.p3.y, t)
  );
}

function ribbonTangent(rb, t) {
  let x = bezierTangent(rb.p0.x, rb.p1.x, rb.p2.x, rb.p3.x, t);
  let y = bezierTangent(rb.p0.y, rb.p1.y, rb.p2.y, rb.p3.y, t);
  return atan2(y, x);
}

// =====================================================
// Color Tools
// =====================================================

function isWhiteLike(c) {
  return brightnessOf(c) > 185 && saturationOf(c) < 55;
}

function boostColor(c) {
  let r = red(c);
  let g = green(c);
  let b = blue(c);

  if (isWhiteLike(c)) {
    return color(
      constrain(r * 1.08, 0, 255),
      constrain(g * 1.08, 0, 255),
      constrain(b * 1.08, 0, 255)
    );
  }

  let avg = (r + g + b) / 3;
  let satBoost = 1.55;
  let brightBoost = 1.18;

  return color(
    constrain((avg + (r - avg) * satBoost) * brightBoost, 0, 255),
    constrain((avg + (g - avg) * satBoost) * brightBoost, 0, 255),
    constrain((avg + (b - avg) * satBoost) * brightBoost, 0, 255)
  );
}

function shiftWithinSameColorFamily(c) {
  let bShift = random(0.88, 1.18);
  let offset = random(-7, 7);

  return color(
    constrain(red(c) * bShift + offset, 0, 255),
    constrain(green(c) * bShift + offset, 0, 255),
    constrain(blue(c) * bShift + offset, 0, 255)
  );
}

// =====================================================
// Image Tools
// =====================================================

function getCoverInfo(img) {
  let imgRatio = img.width / img.height;
  let canvasRatio = width / height;

  let drawW;
  let drawH;

  if (imgRatio > canvasRatio) {
    drawH = height;
    drawW = drawH * imgRatio;
  } else {
    drawW = width;
    drawH = drawW / imgRatio;
  }

  return {
    x: (width - drawW) / 2,
    y: (height - drawH) / 2,
    w: drawW,
    h: drawH
  };
}

function getImagePixel(x, y) {
  x = constrain(x, 0, currentImg.width - 1);
  y = constrain(y, 0, currentImg.height - 1);

  let index = (x + y * currentImg.width) * 4;

  let r = currentImg.pixels[index];
  let g = currentImg.pixels[index + 1];
  let b = currentImg.pixels[index + 2];
  let a = currentImg.pixels[index + 3];

  if (a < 20) return null;
  return color(r, g, b, a);
}

function imageEdgeScore(x, y, step) {
  let c1 = getImagePixel(x, y);
  let c2 = getImagePixel(constrain(x + step, 0, currentImg.width - 1), y);
  let c3 = getImagePixel(x, constrain(y + step, 0, currentImg.height - 1));

  if (!c1 || !c2 || !c3) return 0;

  return abs(brightnessOf(c1) - brightnessOf(c2)) +
         abs(brightnessOf(c1) - brightnessOf(c3));
}

function brightnessOf(c) {
  return (red(c) + green(c) + blue(c)) / 3;
}

function saturationOf(c) {
  return max(red(c), green(c), blue(c)) - min(red(c), green(c), blue(c));
}

function colorDistance(c1, c2) {
  return (
    abs(red(c1) - red(c2)) +
    abs(green(c1) - green(c2)) +
    abs(blue(c1) - blue(c2))
  ) / 3;
}

function easeOutCubic(t) {
  return 1 - pow(1 - t, 3);
}

// =====================================================
// Interaction
// =====================================================

function mousePressed() {
  switchImage();
}

function touchStarted() {
  if (millis() - lastTouchTime > 300) {
    switchImage();
    lastTouchTime = millis();
  }

  return false;
}

function switchImage() {
  currentIndex++;
  currentIndex = currentIndex % imgs.length;
  currentImg = imgs[currentIndex];
  generateNew();
	sceneStartTime = millis();
}

function keyPressed() {
  if (key === "s" || key === "S") {
    saveCanvas("digital_blessing_signal_v44", "png");
  }
}
