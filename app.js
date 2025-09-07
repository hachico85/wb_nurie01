// Simple manifest with graceful fallbacks so it works out-of-the-box.
// Primary paths assume: img/animals/1-5.png, img/vehicles/1-5.png
// Fallbacks map to sample images found under docs/img/transparent_1-10.png
const MANIFEST = {
  animals: [
    ["img/animals/1.png", "docs/img/transparent_1.png"],
    ["img/animals/2.png", "docs/img/transparent_2.png"],
    ["img/animals/3.png", "docs/img/transparent_3.png"],
    ["img/animals/4.png", "docs/img/transparent_4.png"],
    ["img/animals/5.png", "docs/img/transparent_5.png"],
  ],
  vehicles: [
    ["img/vehicles/1.png", "docs/img/transparent_6.png"],
    ["img/vehicles/2.png", "docs/img/transparent_7.png"],
    ["img/vehicles/3.png", "docs/img/transparent_8.png"],
    ["img/vehicles/4.png", "docs/img/transparent_9.png"],
    ["img/vehicles/5.png", "docs/img/transparent_10.png"],
  ],
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const state = {
  category: "animals",
  index: 0,
  tool: "brush", // 'brush' | 'eraser'
  color: "#ff6b6b",
  size: 22,
  // Store paint per image (ImageData) to restore when switching pages
  paints: new Map(), // key: resolvedURL, value: ImageData
};

const paintCanvas = $("#paintLayer");
const paintCtx = paintCanvas.getContext("2d");
const lineArtCanvas = $("#lineArtLayer");
const lineArtCtx = lineArtCanvas.getContext("2d");
const wrap = $("#canvasWrap");

const colorPicker = $("#colorPicker");
const brushSize = $("#brushSize");
const brushBtn = $("#brushBtn");
const eraserBtn = $("#eraserBtn");
const clearBtn = $("#clearBtn");
const thumbToggle = $("#thumbToggle");
const thumbDrawer = $("#thumbDrawer");
const drawerClose = $("#drawerClose");
const thumbGrid = $("#thumbGrid");
const prevBtn = $("#prevBtn");
const nextBtn = $("#nextBtn");
const paletteEl = $("#palette");

// Resolve image path by trying candidates in order, returning first that loads
async function resolveImage(candidates) {
  for (const url of candidates) {
    try {
      await new Promise((res, rej) => {
        const img = new Image();
        img.onload = () => res();
        img.onerror = rej;
        img.src = url;
      });
      return url;
    } catch (_) {
      // try next
    }
  }
  // If all fail, just return first (browser will show broken img)
  return candidates[0];
}

// Build thumbnail grid
async function renderThumbs() {
  thumbGrid.innerHTML = "";
  const list = MANIFEST[state.category];
  const resolved = await Promise.all(list.map(resolveImage));

  resolved.forEach((url, i) => {
    const item = document.createElement("button");
    item.className = "thumb" + (i === state.index ? " active" : "");
    item.setAttribute("role", "listitem");
    item.title = `${state.category} ${i + 1}`;
    const img = document.createElement("img");
    img.src = url;
    img.alt = `${state.category} ${i + 1}`;
    item.appendChild(img);
    item.addEventListener("click", async () => {
      await loadPage(state.category, i);
      openDrawer(false);
    });
    thumbGrid.appendChild(item);
  });
}

// Load current page (line art + restore paint if any)
async function loadPage(category, index) {
  state.category = category;
  state.index = index;
  // Update tab UI
  $$(".tab").forEach((t) => {
    const active = t.dataset.category === category;
    t.classList.toggle("active", active);
    t.setAttribute("aria-selected", String(active));
  });

  // Thumb highlight
  $$(".thumb").forEach((el, i) => el.classList.toggle("active", i === index));

  const candidates = MANIFEST[category][index];
  const url = await resolveImage(candidates);

  // Save current paint before switching
  const keyPrev = lineArtCanvas.dataset.resolvedUrl;
  if (keyPrev) saveCurrentPaint(keyPrev);

  // Load image and draw to lineArt canvas
  const img = new Image();
  await new Promise((res, rej) => {
    img.onload = () => res();
    img.onerror = rej;
    img.src = url;
  });
  
  lineArtCanvas.dataset.resolvedUrl = url;
  fitToWrap(img);

  // Draw line art on lineArt layer
  lineArtCtx.clearRect(0, 0, lineArtCanvas.width, lineArtCanvas.height);
  lineArtCtx.drawImage(img, 0, 0, lineArtCanvas.width, lineArtCanvas.height);

  // Restore stored paint for this page if exists
  const key = url;
  const paint = state.paints.get(key);
  paintCtx.clearRect(0, 0, paintCanvas.width, paintCanvas.height);
  if (paint && paint.width === paintCanvas.width && paint.height === paintCanvas.height) {
    paintCtx.putImageData(paint, 0, 0);
  }

  updateNavButtons();
}

function fitToWrap(img) {
  // Compute size to fit image into wrap while preserving aspect
  const maxW = wrap.clientWidth;
  const maxH = wrap.clientHeight;
  const iw = img.naturalWidth || 1024;
  const ih = img.naturalHeight || 768;
  const scale = Math.min(maxW / iw, maxH / ih);
  const w = Math.floor(iw * scale);
  const h = Math.floor(ih * scale);

  // Center the content using padding around
  const offsetX = Math.floor((maxW - w) / 2);
  const offsetY = Math.floor((maxH - h) / 2);
  
  // Set both canvas sizes and positions
  [paintCanvas, lineArtCanvas].forEach(canvas => {
    canvas.width = w;
    canvas.height = h;
    canvas.style.left = offsetX + "px";
    canvas.style.top = offsetY + "px";
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
  });
}

function saveCurrentPaint(key) {
  try {
    const data = paintCtx.getImageData(0, 0, paintCanvas.width, paintCanvas.height);
    state.paints.set(key, data);
  } catch (_) {
    // ignore (tainted canvas unlikely here)
  }
}

// Painting logic
let drawing = false;
let last = null; // {x,y}

function setTool(tool) {
  state.tool = tool;
  brushBtn.setAttribute("aria-pressed", String(tool === "brush"));
  eraserBtn.setAttribute("aria-pressed", String(tool === "eraser"));
}

function getLocalPoint(evt) {
  const rect = paintCanvas.getBoundingClientRect();
  return {
    x: (evt.clientX - rect.left),
    y: (evt.clientY - rect.top),
  };
}

function beginDraw(pt) {
  drawing = true;
  last = pt;
  paintCtx.lineJoin = "round";
  paintCtx.lineCap = "round";
  paintCtx.lineWidth = state.size;
  paintCtx.strokeStyle = state.color;
  paintCtx.globalCompositeOperation = state.tool === "eraser" ? "destination-out" : "source-over";
  paintCtx.beginPath();
  paintCtx.moveTo(pt.x, pt.y);
}

function drawTo(pt) {
  if (!drawing) return;
  paintCtx.lineTo(pt.x, pt.y);
  paintCtx.stroke();
  last = pt;
}

function endDraw() {
  if (!drawing) return;
  drawing = false;
  paintCtx.closePath();
}

// Swipe (flick) detection
let gesture = null; // {startX, startY, t}
function handlePointerDown(e) {
  const pt = getLocalPoint(e);
  beginDraw(pt);
  gesture = { startX: e.clientX, startY: e.clientY, t: Date.now() };
}
function handlePointerMove(e) {
  if (!drawing) return;
  const pt = getLocalPoint(e);
  drawTo(pt);
}
function handlePointerUp(e) {
  const wasDrawing = drawing;
  endDraw();

  // Detect horizontal flick when minimal drawing occurred (short stroke or quick swipe)
  if (gesture) {
    const dx = e.clientX - gesture.startX;
    const dy = e.clientY - gesture.startY;
    const dt = Date.now() - gesture.t;
    const absDx = Math.abs(dx), absDy = Math.abs(dy);
    const isFlick = dt < 500 && absDx > 80 && absDy < 50;
    if (isFlick && !wasDrawing) {
      if (dx < 0) nextPage(); else prevPage();
    }
  }
  gesture = null;
}

function preventDefault(e) { e.preventDefault(); }

function bindCanvasEvents() {
  paintCanvas.addEventListener("pointerdown", handlePointerDown);
  paintCanvas.addEventListener("pointermove", handlePointerMove);
  window.addEventListener("pointerup", handlePointerUp);
  // Prevent scrolling on touch
  ["touchstart","touchmove","touchend"].forEach(type => paintCanvas.addEventListener(type, preventDefault, { passive: false }));
}

function openDrawer(open) {
  thumbDrawer.setAttribute("aria-hidden", String(!open));
}

function updateNavButtons() {
  const count = MANIFEST[state.category].length;
  prevBtn.disabled = state.index <= 0;
  nextBtn.disabled = state.index >= count - 1;
}

async function prevPage() {
  if (state.index <= 0) return;
  await loadPage(state.category, state.index - 1);
}
async function nextPage() {
  const count = MANIFEST[state.category].length;
  if (state.index >= count - 1) return;
  await loadPage(state.category, state.index + 1);
}

// ---------- Color palette ----------
const PALETTE = [
  "#000000", // black
  "#6B7280", // gray
  "#8B5E3C", // brown
  "#F59E0B", // yellow
  "#F97316", // orange
  "#E11D48", // red
  "#EC4899", // pink
  "#8B5CF6", // purple
  "#6366F1", // indigo
  "#3B82F6", // blue
  "#14B8A6", // teal
  "#10B981", // green
];

function normalizeHex(h) {
  return (h || "").toString().trim().toLowerCase();
}

function renderPalette() {
  if (!paletteEl) return;
  paletteEl.innerHTML = "";
  PALETTE.forEach((hex, idx) => {
    const btn = document.createElement("button");
    btn.className = "swatch";
    btn.type = "button";
    btn.title = `色 ${idx + 1}`;
    btn.dataset.color = hex;
    btn.style.background = hex;
    btn.setAttribute("aria-pressed", String(normalizeHex(state.color) === normalizeHex(hex)));
    btn.addEventListener("click", () => selectColor(hex, true));
    paletteEl.appendChild(btn);
  });
}

function updatePaletteSelection() {
  if (!paletteEl) return;
  const target = normalizeHex(state.color);
  const swatches = Array.from(paletteEl.querySelectorAll('.swatch'));
  swatches.forEach((b) => {
    const isActive = normalizeHex(b.dataset.color) === target;
    b.setAttribute("aria-pressed", String(isActive));
  });
}

function selectColor(hex, fromPalette = false) {
  state.color = normalizeHex(hex);
  if (fromPalette && colorPicker) colorPicker.value = state.color;
  updatePaletteSelection();
}

// UI bindings
function bindUI() {
  // Tabs
  $$(".tab").forEach((btn) => btn.addEventListener("click", async () => {
    const cat = btn.dataset.category;
    if (state.category !== cat) {
      await renderThumbs();
      await loadPage(cat, 0);
    }
  }));

  // Tools
  brushBtn.addEventListener("click", () => setTool("brush"));
  eraserBtn.addEventListener("click", () => setTool("eraser"));
  colorPicker.addEventListener("input", (e) => { selectColor(e.target.value, false); });
  brushSize.addEventListener("input", (e) => state.size = Number(e.target.value));
  clearBtn.addEventListener("click", () => {
    paintCtx.clearRect(0, 0, paintCanvas.width, paintCanvas.height);
    // clear stored paint for this page
    const key = lineArtCanvas.dataset.resolvedUrl;
    if (key) state.paints.delete(key);
  });

  // Drawer
  thumbToggle.addEventListener("click", async () => {
    const isOpen = thumbDrawer.getAttribute("aria-hidden") === "false";
    if (!isOpen) await renderThumbs();
    openDrawer(!isOpen);
  });
  drawerClose.addEventListener("click", () => openDrawer(false));

  // Nav arrows
  prevBtn.addEventListener("click", prevPage);
  nextBtn.addEventListener("click", nextPage);

  // Resize handling to keep alignment
  window.addEventListener("resize", () => {
    const key = lineArtCanvas.dataset.resolvedUrl;
    // Preserve current paint and re-fit
    if (key) saveCurrentPaint(key);
    const img = new Image();
    img.src = key;
    img.onload = () => {
      fitToWrap(img);
      lineArtCtx.clearRect(0, 0, lineArtCanvas.width, lineArtCanvas.height);
      lineArtCtx.drawImage(img, 0, 0, lineArtCanvas.width, lineArtCanvas.height);
      const data = key && state.paints.get(key);
      if (data && data.width === paintCanvas.width && data.height === paintCanvas.height) {
        paintCtx.putImageData(data, 0, 0);
      }
    };
  });
}

async function init() {
  bindCanvasEvents();
  bindUI();
  renderPalette();
  updatePaletteSelection();
  setTool("brush");
  await renderThumbs();
  await loadPage(state.category, state.index);
}

init().catch((e) => {
  console.error(e);
  alert("初期化に失敗しました: " + e);
});
