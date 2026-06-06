/**
 * Main entry - game loop & state machine
 * G = accelerate, F = brake, A/D or arrows = steer
 */
(() => {
  const canvas = document.getElementById('game-canvas');
  const keys = { left: false, right: false, accel: false, brake: false };
  let state = 'start';
  let currentLevel = 0;
  let trackData = null;
  let position = 0;

  Renderer.init(canvas);
  UI.init();
  UI.showStart();

  // Input
  window.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = true;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = true;
    if (e.key === 'g' || e.key === 'G') keys.accel = true;
    if (e.key === 'f' || e.key === 'F') keys.brake = true;
    if (e.key === ' ' || e.key === 'Enter') handleAction();
  });
  window.addEventListener('keyup', e => {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = false;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = false;
    if (e.key === 'g' || e.key === 'G') keys.accel = false;
    if (e.key === 'f' || e.key === 'F') keys.brake = false;
  });

  // Touch controls
  let touchStartX = 0;
  let touchAccel = false;
  canvas.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
    // Bottom half = accel, top half = brake
    if (e.touches[0].clientY > window.innerHeight * 0.5) {
      keys.accel = true;
    }
    e.preventDefault();
  }, { passive: false });
  canvas.addEventListener('touchmove', e => {
    const dx = e.touches[0].clientX - touchStartX;
    keys.left = dx < -20;
    keys.right = dx > 20;
    e.preventDefault();
  }, { passive: false });
  canvas.addEventListener('touchend', () => {
    keys.left = false;
    keys.right = false;
    keys.accel = false;
    keys.brake = false;
  });

  // Button handlers
  document.getElementById('btn-start').addEventListener('click', startGame);
  document.getElementById('btn-retry').addEventListener('click', retryLevel);
  document.getElementById('btn-restart').addEventListener('click', () => {
    currentLevel = 0;
    Ball.init(Track.getBaseSpeed(0), 1);
    startGame();
  });

  function handleAction() {
    if (state === 'start') startGame();
    else if (state === 'dead') retryLevel();
    else if (state === 'win') {
      currentLevel = 0;
      Ball.init(Track.getBaseSpeed(0), 1);
      startGame();
    }
  }

  function startGame() {
    const ballLevel = Ball.getLevel() || 1;
    trackData = Track.buildTrack(currentLevel, ballLevel);
    Ball.init(Track.getBaseSpeed(currentLevel), ballLevel);
    position = 0;
    state = 'playing';
    UI.showGame();
  }

  function retryLevel() {
    const ballLevel = Ball.getLevel();
    trackData = Track.buildTrack(currentLevel, ballLevel);
    Ball.init(Track.getBaseSpeed(currentLevel), ballLevel);
    position = 0;
    state = 'playing';
    UI.showGame();
  }

  function nextLevel() {
    currentLevel++;
    if (currentLevel >= Track.getLevelCount()) {
      state = 'win';
      UI.showWin();
      return;
    }

    state = 'merging';
    Ball.mergeUp();
    UI.showMerge(Ball.getLevel(), () => {
      trackData = Track.buildTrack(currentLevel, Ball.getLevel());
      Ball.init(Track.getBaseSpeed(currentLevel), Ball.getLevel());
      position = 0;
      state = 'playing';
      UI.showGame();
    });
  }

  // Game loop
  function loop() {
    requestAnimationFrame(loop);

    if (state === 'playing' && trackData) {
      // Get active rows based on current layer
      const layer = Ball.getLayer();
      const activeRows = layer === 0
        ? trackData.rows
        : (trackData.lowerLayers[layer - 1] || trackData.rows);

      const posInt = Math.floor(position);

      if (posInt >= 0 && posInt < activeRows.length) {
        const currentRow = activeRows[posInt];
        Ball.update(keys, currentRow, currentRow.trackWidth);

        // Check finish
        if (currentRow.isFinish && Ball.getSpeed() > 0) {
          nextLevel();
          return;
        }

        // Check death
        if (!Ball.isAlive()) {
          state = 'dead';
          setTimeout(() => UI.showDeath(), 500);
        }

        // Advance position (only when speed > 0)
        position += Ball.getSpeed() * 0.16;
        if (position >= activeRows.length - 1) {
          nextLevel();
          return;
        }
      }

      // Render
      Renderer.render(
        trackData,
        position,
        Ball.getX(),
        Ball.getRadius(),
        Ball.isBoosting(),
        Ball.getLevel(),
        Ball.getLayer(),
        Ball.getFallProgress(),
        Ball.isFalling()
      );

      // Update HUD
      UI.updateHUD(
        currentLevel,
        Ball.getLevel(),
        Ball.getSpeed(),
        Ball.getMaxSpeed() * 2,
        Ball.getLayer()
      );
    } else if (trackData) {
      Renderer.render(
        trackData,
        position,
        Ball.getX(),
        Ball.getRadius(),
        false,
        Ball.getLevel(),
        0, 0, false
      );
    }
  }

  // Build initial track for background
  trackData = Track.buildTrack(0, 1);
  Ball.init(Track.getBaseSpeed(0), 1);
  loop();
})();
