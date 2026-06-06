/**
 * Ball physics and control
 * G = accelerate, F = brake, default = stationary
 * Speed changes gradually (smooth ramp)
 * Supports falling to lower track layer
 */
const Ball = (() => {
  let x = 0;
  let speed = 0;
  let targetSpeed = 0;
  let lateralVel = 0;
  let maxSpeed = 3;
  let boostTimer = 0;
  let ballLevel = 1;
  let alive = true;
  let currentLayer = 0;
  let falling = false;
  let fallTimer = 0;
  let luckyLand = false;

  const LATERAL_ACCEL = 0.35;
  const LATERAL_FRICTION = 0.88;
  const BOOST_MULTIPLIER = 1.5;
  const BOOST_DURATION = 60;
  const MAX_LATERAL = 6;
  const ACCEL_RATE = 0.018;
  const BRAKE_RATE = 0.04;
  const COAST_DECAY = 0.06;
  const LUCKY_CHANCE = 0.45;
  const FALL_FRAMES = 40;

  function init(lvlMaxSpeed, level) {
    x = 0;
    speed = 0;
    targetSpeed = 0;
    maxSpeed = lvlMaxSpeed;
    lateralVel = 0;
    boostTimer = 0;
    ballLevel = level;
    alive = true;
    currentLayer = 0;
    falling = false;
    fallTimer = 0;
    luckyLand = false;
  }

  function update(keys, currentRow, trackWidth) {
    if (!alive) return;

    if (falling) {
      fallTimer--;
      speed *= 0.95;
      if (fallTimer <= 0) {
        if (luckyLand) {
          falling = false;
          currentLayer++;
          x = 0;
          lateralVel = 0;
          speed *= 0.5;
        } else {
          alive = false;
        }
      }
      return;
    }

    // G = accelerate (must hold), F = brake, release = stop
    if (keys.accel) {
      targetSpeed = maxSpeed;
    } else if (keys.brake) {
      targetSpeed = 0;
    } else {
      // Not pressing G → quickly slow to stop
      targetSpeed = 0;
    }

    // Smooth speed transition
    if (speed < targetSpeed) {
      speed += ACCEL_RATE * maxSpeed;
      if (speed > targetSpeed) speed = targetSpeed;
    } else if (speed > targetSpeed) {
      speed -= BRAKE_RATE * maxSpeed;
      if (speed < 0) speed = 0;
    }

    // Slope influence
    if (currentRow && currentRow.slope) {
      const slopeForce = -currentRow.slope * 0.08 * maxSpeed;
      speed = Math.max(0, speed + slopeForce);
    }

    // Boost pad
    if (currentRow && currentRow.isBoost && speed > 0) {
      boostTimer = BOOST_DURATION;
    }
    if (boostTimer > 0) {
      boostTimer--;
      speed = Math.min(speed, maxSpeed * BOOST_MULTIPLIER);
      if (keys.accel) {
        speed += ACCEL_RATE * maxSpeed * 0.5;
      }
      speed = Math.min(speed, maxSpeed * BOOST_MULTIPLIER);
    } else {
      speed = Math.min(speed, maxSpeed);
    }

    // Lateral control
    const dir = (keys.left ? -1 : 0) + (keys.right ? 1 : 0);
    lateralVel += dir * LATERAL_ACCEL;
    lateralVel *= LATERAL_FRICTION;
    lateralVel = Math.max(-MAX_LATERAL, Math.min(MAX_LATERAL, lateralVel));

    if (currentRow && currentRow.curve) {
      lateralVel += currentRow.curve * 0.15;
    }

    x += lateralVel;

    // Track bounds
    const halfW = (trackWidth / 2) - getRadius();
    if (Math.abs(x) > halfW) {
      if (currentRow && currentRow.wallHeight > 15) {
        x = Math.sign(x) * halfW;
        lateralVel = -lateralVel * 0.4;
      } else {
        const overshoot = Math.abs(x) - halfW;
        if (overshoot > 15) {
          startFall();
          return;
        }
        x = Math.sign(x) * halfW;
        lateralVel *= 0.3;
      }
    }

    // Obstacle collision
    if (currentRow && currentRow.hasObstacle) {
      const obsW = 25 + ballLevel * 3;
      if (Math.abs(x - currentRow.obstacleX) < obsW) {
        alive = false;
      }
    }
  }

  function startFall() {
    falling = true;
    fallTimer = FALL_FRAMES;
    luckyLand = Math.random() < LUCKY_CHANCE;
  }

  function getRadius() {
    return 12 + (ballLevel - 1) * 4;
  }

  function getX() { return x; }
  function getSpeed() { return speed; }
  function getMaxSpeed() { return maxSpeed; }
  function getLevel() { return ballLevel; }
  function isAlive() { return alive; }
  function isBoosting() { return boostTimer > 0; }
  function isFalling() { return falling; }
  function isLuckyLand() { return luckyLand; }
  function getLayer() { return currentLayer; }
  function getFallProgress() { return falling ? 1 - (fallTimer / FALL_FRAMES) : 0; }

  function mergeUp() {
    ballLevel++;
  }

  return {
    init, update, getX, getSpeed, getMaxSpeed, getRadius,
    getLevel, isAlive, isBoosting, isFalling, isLuckyLand,
    getLayer, getFallProgress, mergeUp, startFall
  };
})();
