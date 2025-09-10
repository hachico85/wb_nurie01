// Dynamic category configuration - loaded from categories.json
let CATEGORIES = [];
let MANIFEST = {};
let categoryTitles = {};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const state = {
  currentScreen: "menu", // 'menu' | 'thumbs' | 'paint'
  category: "fairy",
  index: 0,
  tool: "brush", // 'brush' | 'eraser'
  color: "#ff6b6b",
  size: 22,
  // Store paint per image (ImageData) to restore when switching pages
  paints: new Map(), // key: resolvedURL, value: ImageData
};

// Initialize elements after DOM is loaded
let paintCanvas, paintCtx, lineArtCanvas, lineArtCtx, wrap;
let menuScreen, thumbScreen, paintScreen;
let backToMenu, thumbTitle, thumbGrid;
let backToThumbs, paintTitle, prevPaintBtn, nextPaintBtn;
let colorPicker, brushSize, brushBtn, eraserBtn, clearBtn, paletteEl;
let paintLoading;

function initElements() {
  paintCanvas = $("#paintLayer");
  paintCtx = paintCanvas?.getContext("2d");
  lineArtCanvas = $("#lineArtLayer");
  lineArtCtx = lineArtCanvas?.getContext("2d");
  wrap = $("#canvasWrap");

  // Screen elements
  menuScreen = $("#menuScreen");
  thumbScreen = $("#thumbScreen");
  paintScreen = $("#paintScreen");

  // Menu elements are dynamically generated
  
  // Thumbnail elements
  backToMenu = $("#backToMenu");
  thumbTitle = $("#thumbTitle");
  thumbGrid = $("#thumbGrid");

  // Paint elements
  backToThumbs = $("#backToThumbs");
  paintTitle = $("#paintTitle");
  prevPaintBtn = $("#prevPaintBtn");
  nextPaintBtn = $("#nextPaintBtn");

  colorPicker = $("#colorPicker");
  brushSize = $("#brushSize");
  brushBtn = $("#brushBtn");
  eraserBtn = $("#eraserBtn");
  clearBtn = $("#clearBtn");
  paletteEl = $("#palette");
  paintLoading = $("#paintLoading");
}

// Screen management
function showScreen(screenName) {
  // Hide all screens
  if (menuScreen) menuScreen.style.display = 'none';
  if (thumbScreen) thumbScreen.style.display = 'none';
  if (paintScreen) paintScreen.style.display = 'none';
  
  state.currentScreen = screenName;
  
  switch(screenName) {
    case 'menu':
      if (menuScreen) menuScreen.style.display = 'flex';
      break;
    case 'thumbs':
      if (thumbScreen) thumbScreen.style.display = 'flex';
      break;
    case 'paint':
      if (paintScreen) paintScreen.style.display = 'flex';
      break;
  }
}

// Generate category menu buttons dynamically
function renderCategoryMenu() {
  const categoryButtons = document.querySelector('#categoryButtons');
  if (!categoryButtons) {
    console.error('Category buttons container not found');
    return;
  }
  
  categoryButtons.innerHTML = '';
  
  CATEGORIES.forEach(category => {
    const button = document.createElement('button');
    button.className = 'category-btn';
    button.dataset.category = category.id;
    button.title = category.description;
    
    button.innerHTML = `
      <div class="category-icon">${category.icon}</div>
      <span>${category.name}</span>
    `;
    
    // Add click event listener
    button.addEventListener('click', () => {
      state.category = category.id;
      renderThumbs();
      showScreen('thumbs');
    });
    
    categoryButtons.appendChild(button);
  });
  
  console.log('Category menu generated:', CATEGORIES.length, 'buttons');
}

// Load category configuration from JSON file
async function loadCategories() {
  try {
    console.log('Loading categories from categories.json...');
    const response = await fetch('categories.json');
    
    if (!response.ok) {
      throw new Error(`Failed to load categories: ${response.status}`);
    }
    
    const config = await response.json();
    CATEGORIES = config.categories;
    
    // Convert to existing format for compatibility
    MANIFEST = {};
    categoryTitles = {};
    
    CATEGORIES.forEach(category => {
      // Build image paths
      MANIFEST[category.id] = category.images.map(img => `img/${category.folder}/${img}`);
      // Set category titles
      categoryTitles[category.id] = category.name;
    });
    
    console.log('Categories loaded successfully:', CATEGORIES.length, 'categories');
    console.log('MANIFEST:', MANIFEST);
    
    return true;
  } catch (error) {
    console.error('Failed to load categories:', error);
    
    // Fallback to hardcoded categories if JSON fails
    console.log('Using fallback categories...');
    CATEGORIES = [
      {
        id: "fairy",
        name: "妖精", 
        displayName: "妖精のぬりえ",
        icon: "🧚‍♀️",
        folder: "01_fairy",
        images: ["01.png", "02.png", "03.png"],
        description: "かわいい妖精たち"
      },
      {
        id: "car",
        name: "車",
        displayName: "車のぬりえ", 
        icon: "🚗",
        folder: "02_car",
        images: ["01.png", "02.png", "03.png"],
        description: "かっこいい車"
      },
      {
        id: "ninja",
        name: "忍者",
        displayName: "忍者のぬりえ",
        icon: "🥷", 
        folder: "03_ninja",
        images: ["01.png", "02.png", "03.png"],
        description: "強い忍者"
      }
    ];
    
    // Convert fallback to existing format
    MANIFEST = {};
    categoryTitles = {};
    
    CATEGORIES.forEach(category => {
      MANIFEST[category.id] = category.images.map(img => `img/${category.folder}/${img}`);
      categoryTitles[category.id] = category.name;
    });
    
    return false;
  }
}

// Simple image loading
async function resolveImage(url) {
  try {
    await new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => res();
      img.onerror = rej;
      img.src = url;
    });
    return url;
  } catch (_) {
    console.error('Failed to load image:', url);
    throw new Error(`Failed to load image: ${url}`);
  }
}

// Show thumbnail loading skeletons
function showThumbLoading() {
  thumbGrid.innerHTML = "";
  
  // Show skeleton loading items
  for (let i = 0; i < 3; i++) {
    const skeleton = document.createElement("div");
    skeleton.className = "thumb thumb-skeleton";
    thumbGrid.appendChild(skeleton);
  }
}

// Build thumbnail grid for current category
async function renderThumbs() {
  // Show loading skeletons first
  showThumbLoading();
  
  // Small delay to show loading state
  await new Promise(resolve => setTimeout(resolve, 100));
  
  thumbGrid.innerHTML = "";
  
  // Use displayName from categories config with icon
  const category = CATEGORIES.find(cat => cat.id === state.category);
  if (category) {
    thumbTitle.innerHTML = `${category.icon} ${category.displayName}`;
  } else {
    thumbTitle.textContent = `${categoryTitles[state.category]}のぬりえ`;
  }
  
  const list = MANIFEST[state.category];

  // Load thumbnails with loading states
  const promises = list.map(async (url, i) => {
    const item = document.createElement("button");
    item.className = "thumb";
    item.title = `${categoryTitles[state.category]} ${i + 1}`;
    
    // Create img element and wait for it to load
    const img = document.createElement("img");
    img.alt = `${categoryTitles[state.category]} ${i + 1}`;
    
    // Add loading state to thumbnail
    item.appendChild(img);
    
    item.addEventListener("click", async () => {
      state.index = i;
      await loadPaintScreen();
    });
    
    // Load image asynchronously
    try {
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = url;
      });
    } catch (error) {
      console.warn(`Failed to load thumbnail: ${url}`, error);
    }
    
    return item;
  });

  // Wait for all thumbnails to load and add them
  const loadedItems = await Promise.all(promises);
  thumbGrid.innerHTML = ""; // Clear skeletons
  loadedItems.forEach(item => thumbGrid.appendChild(item));
}

// Show loading indicator
function showPaintLoading(show) {
  if (paintLoading) {
    paintLoading.style.display = show ? 'flex' : 'none';
  }
}

// Load paint screen with current image
async function loadPaintScreen() {
  showScreen('paint');
  showPaintLoading(true);
  
  // Wait for paint screen to be visible before loading image
  await new Promise(resolve => setTimeout(resolve, 50));
  
  try {
    await loadPage(state.category, state.index);
    paintTitle.textContent = `${categoryTitles[state.category]} ${state.index + 1}`;
    updatePaintNavButtons();
  } finally {
    // Ensure loading is hidden even if there's an error
    showPaintLoading(false);
  }
}

// Load current page (line art + restore paint if any)
async function loadPage(category, index) {
  state.category = category;
  state.index = index;

  const url = MANIFEST[category][index];
  await resolveImage(url);

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
}

function updatePaintNavButtons() {
  const count = MANIFEST[state.category].length;
  prevPaintBtn.disabled = state.index <= 0;
  nextPaintBtn.disabled = state.index >= count - 1;
}

async function prevPaint() {
  if (state.index <= 0) return;
  showPaintLoading(true);
  try {
    state.index--;
    await loadPage(state.category, state.index);
    paintTitle.textContent = `${categoryTitles[state.category]} ${state.index + 1}`;
    updatePaintNavButtons();
  } finally {
    showPaintLoading(false);
  }
}

async function nextPaint() {
  const count = MANIFEST[state.category].length;
  if (state.index >= count - 1) return;
  showPaintLoading(true);
  try {
    state.index++;
    await loadPage(state.category, state.index);
    paintTitle.textContent = `${categoryTitles[state.category]} ${state.index + 1}`;
    updatePaintNavButtons();
  } finally {
    showPaintLoading(false);
  }
}

function fitToWrap(img) {
  // Compute size to fit image into wrap while preserving aspect
  const maxW = wrap.clientWidth;
  const maxH = wrap.clientHeight;
  
  if (maxW === 0 || maxH === 0) {
    // Retry after a short delay if wrap is not visible yet
    setTimeout(() => fitToWrap(img), 100);
    return;
  }
  
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
  
  // Re-initialize paint context after canvas resize
  paintCtx.lineJoin = "round";
  paintCtx.lineCap = "round";
  paintCtx.lineWidth = state.size;
  paintCtx.strokeStyle = state.color;
  paintCtx.globalCompositeOperation = "source-over";
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
  
  // Handle both mouse and touch events
  let clientX, clientY;
  if (evt.touches && evt.touches.length > 0) {
    // Touch event
    clientX = evt.touches[0].clientX;
    clientY = evt.touches[0].clientY;
  } else if (evt.changedTouches && evt.changedTouches.length > 0) {
    // Touch end event
    clientX = evt.changedTouches[0].clientX;
    clientY = evt.changedTouches[0].clientY;
  } else {
    // Mouse event
    clientX = evt.clientX;
    clientY = evt.clientY;
  }
  
  // Convert to canvas coordinates
  const scaleX = paintCanvas.width / rect.width;
  const scaleY = paintCanvas.height / rect.height;
  
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY,
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
  
  // Handle gesture tracking for both mouse and touch
  let clientX, clientY;
  if (e.touches && e.touches.length > 0) {
    clientX = e.touches[0].clientX;
    clientY = e.touches[0].clientY;
  } else {
    clientX = e.clientX;
    clientY = e.clientY;
  }
  
  gesture = { startX: clientX, startY: clientY, t: Date.now() };
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
  // Only in paint screen
  if (gesture && state.currentScreen === 'paint') {
    let clientX, clientY;
    if (e.changedTouches && e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    const dx = clientX - gesture.startX;
    const dy = clientY - gesture.startY;
    const dt = Date.now() - gesture.t;
    const absDx = Math.abs(dx), absDy = Math.abs(dy);
    const isFlick = dt < 500 && absDx > 80 && absDy < 50;
    if (isFlick && !wasDrawing) {
      if (dx < 0) nextPaint(); else prevPaint();
    }
  }
  gesture = null;
}

function preventDefault(e) { e.preventDefault(); }

function bindCanvasEvents() {
  if (!paintCanvas) {
    console.error("paintCanvas is null!");
    return;
  }
  
  
  // Use pointer events only
  paintCanvas.addEventListener("pointerdown", handlePointerDown);
  paintCanvas.addEventListener("pointermove", handlePointerMove);
  window.addEventListener("pointerup", handlePointerUp);
  // Prevent scrolling on touch
  ["touchstart","touchmove","touchend"].forEach(type => paintCanvas.addEventListener(type, preventDefault, { passive: false }));
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
  // Category buttons are now dynamically generated in renderCategoryMenu()
  // No need to bind static category buttons
  
  // Back buttons
  if (backToMenu) {
    backToMenu.addEventListener("click", () => showScreen('menu'));
  }
  if (backToThumbs) {
    backToThumbs.addEventListener("click", () => {
      renderThumbs();
      showScreen('thumbs');
    });
  }

  // Paint navigation
  if (prevPaintBtn) {
    prevPaintBtn.addEventListener("click", prevPaint);
  }
  if (nextPaintBtn) {
    nextPaintBtn.addEventListener("click", nextPaint);
  }

  // Tools (only active in paint screen)
  if (brushBtn) {
    brushBtn.addEventListener("click", () => setTool("brush"));
  }
  if (eraserBtn) {
    eraserBtn.addEventListener("click", () => setTool("eraser"));
  }
  if (colorPicker) {
    colorPicker.addEventListener("input", (e) => { selectColor(e.target.value, false); });
  }
  if (brushSize) {
    brushSize.addEventListener("input", (e) => state.size = Number(e.target.value));
  }
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      paintCtx.clearRect(0, 0, paintCanvas.width, paintCanvas.height);
      // clear stored paint for this page
      const key = lineArtCanvas.dataset.resolvedUrl;
      if (key) state.paints.delete(key);
    });
  }

  // Resize handling to keep alignment (only in paint screen)
  window.addEventListener("resize", () => {
    if (state.currentScreen !== 'paint') return;
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
  // Initialize DOM elements first
  initElements();
  
  // Load category configuration
  await loadCategories();
  
  // Generate category menu from configuration
  renderCategoryMenu();
  
  bindCanvasEvents();
  bindUI();
  renderPalette();
  updatePaletteSelection();
  setTool("brush");
  
  // Start with menu screen
  showScreen('menu');
}

// Wait for DOM to be fully loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    init().catch((e) => {
      console.error('Initialization error:', e);
      console.error('Error type:', typeof e);
      console.error('Error message:', e.message);
      console.error('Error stack:', e.stack);
      alert("初期化に失敗しました: " + (e.message || e.toString()));
    });
  });
} else {
  init().catch((e) => {
    console.error('Initialization error:', e);
    console.error('Error type:', typeof e);
    console.error('Error message:', e.message);
    console.error('Error stack:', e.stack);
    alert("初期化に失敗しました: " + (e.message || e.toString()));
  });
}
