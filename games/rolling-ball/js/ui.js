/**
 * UI layer - screen management
 */
const UI = (() => {
  let startScreen, deathScreen, mergeScreen, winScreen;
  let levelEl, sizeEl, speedBar, layerEl;

  function init() {
    startScreen = document.getElementById('start-screen');
    deathScreen = document.getElementById('death-screen');
    mergeScreen = document.getElementById('merge-screen');
    winScreen = document.getElementById('win-screen');
    levelEl = document.getElementById('hud-level');
    sizeEl = document.getElementById('hud-size');
    speedBar = document.getElementById('speed-bar');
    layerEl = document.getElementById('hud-layer');
  }

  function showStart() {
    startScreen.classList.remove('hidden');
    deathScreen.classList.add('hidden');
    mergeScreen.classList.add('hidden');
    winScreen.classList.add('hidden');
  }

  function showGame() {
    startScreen.classList.add('hidden');
    deathScreen.classList.add('hidden');
    mergeScreen.classList.add('hidden');
    winScreen.classList.add('hidden');
  }

  function showDeath() {
    deathScreen.classList.remove('hidden');
  }

  function showMerge(newLevel, callback) {
    mergeScreen.classList.remove('hidden');
    const info = mergeScreen.querySelector('.merge-info');
    if (info) info.textContent = `铁球融合 → 等级 ${newLevel}`;

    // Auto-continue after animation
    setTimeout(() => {
      mergeScreen.classList.add('hidden');
      if (callback) callback();
    }, 2500);
  }

  function showWin() {
    winScreen.classList.remove('hidden');
  }

  function updateHUD(level, ballLevel, speed, maxSpeed, layer) {
    if (levelEl) levelEl.textContent = `关卡 ${level + 1}`;
    if (sizeEl) sizeEl.textContent = `铁球等级: ${ballLevel}`;
    if (layerEl) {
      if (layer > 0) {
        layerEl.textContent = `下层轨道 ${layer}`;
        layerEl.style.display = 'block';
      } else {
        layerEl.style.display = 'none';
      }
    }
    if (speedBar) {
      const pct = Math.min(100, (speed / maxSpeed) * 100);
      speedBar.style.width = pct + '%';
      // Color shift
      if (pct > 70) {
        speedBar.style.background = 'linear-gradient(90deg, #ff9800, #f44336)';
      } else {
        speedBar.style.background = 'linear-gradient(90deg, #4fc3f7, #ff9800)';
      }
    }
  }

  return { init, showStart, showGame, showDeath, showMerge, showWin, updateHUD };
})();
