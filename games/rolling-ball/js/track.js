/**
 * Track generation & level data
 * Each segment: { type, length, curve?, slope?, options }
 * Supports multiple layers (upper track + lower rescue tracks)
 */
const Track = (() => {
  const SEG = {
    STRAIGHT: 'straight',
    CURVE: 'curve',
    TUNNEL: 'tunnel',
    BOOST: 'boost',
    ROTATING: 'rotating',
    FINISH: 'finish'
  };

  // Level definitions - much longer tracks
  const levels = [
    // Level 1: Tutorial
    {
      name: '初级轨道',
      baseSpeed: 1.5,
      trackWidth: 120,
      lowerTrackCount: 8,
      segments: [
        { type: SEG.STRAIGHT, length: 100 },
        { type: SEG.CURVE, length: 50, curve: -0.6 },
        { type: SEG.STRAIGHT, length: 80 },
        { type: SEG.CURVE, length: 40, curve: 0.8 },
        { type: SEG.STRAIGHT, length: 100 },
        { type: SEG.CURVE, length: 35, curve: -0.5 },
        { type: SEG.STRAIGHT, length: 80 },
        { type: SEG.CURVE, length: 45, curve: 0.7 },
        { type: SEG.STRAIGHT, length: 90 },
        { type: SEG.CURVE, length: 30, curve: -0.4 },
        { type: SEG.STRAIGHT, length: 70 },
        { type: SEG.FINISH, length: 15 }
      ]
    },
    // Level 2: Tunnels & signals
    {
      name: '隧道穿越',
      baseSpeed: 1.8,
      trackWidth: 120,
      lowerTrackCount: 10,
      segments: [
        { type: SEG.STRAIGHT, length: 80 },
        { type: SEG.TUNNEL, length: 60, signal: 'green', obstacles: [15, 30, 45] },
        { type: SEG.STRAIGHT, length: 50 },
        { type: SEG.CURVE, length: 45, curve: 1.0 },
        { type: SEG.STRAIGHT, length: 60 },
        { type: SEG.TUNNEL, length: 70, signal: 'red', obstacles: [10, 25, 40, 55] },
        { type: SEG.STRAIGHT, length: 60 },
        { type: SEG.CURVE, length: 40, curve: -0.9 },
        { type: SEG.STRAIGHT, length: 50 },
        { type: SEG.TUNNEL, length: 55, signal: 'alternate', obstacles: [12, 28, 42] },
        { type: SEG.STRAIGHT, length: 60 },
        { type: SEG.CURVE, length: 35, curve: 0.7 },
        { type: SEG.STRAIGHT, length: 50 },
        { type: SEG.FINISH, length: 15 }
      ]
    },
    // Level 3: Boost pads & slopes
    {
      name: '极速坡道',
      baseSpeed: 2.0,
      trackWidth: 115,
      lowerTrackCount: 12,
      segments: [
        { type: SEG.STRAIGHT, length: 60 },
        { type: SEG.STRAIGHT, length: 50, slope: 0.6 },
        { type: SEG.BOOST, length: 30, slope: 1.0 },
        { type: SEG.STRAIGHT, length: 40, slope: -0.4 },
        { type: SEG.CURVE, length: 50, curve: -0.8 },
        { type: SEG.STRAIGHT, length: 50 },
        { type: SEG.STRAIGHT, length: 40, slope: 0.8 },
        { type: SEG.BOOST, length: 25, slope: 1.2 },
        { type: SEG.TUNNEL, length: 50, signal: 'red', obstacles: [12, 25, 38] },
        { type: SEG.STRAIGHT, length: 50 },
        { type: SEG.CURVE, length: 45, curve: 0.7 },
        { type: SEG.BOOST, length: 20, slope: 0.5 },
        { type: SEG.STRAIGHT, length: 60 },
        { type: SEG.CURVE, length: 40, curve: -0.6 },
        { type: SEG.STRAIGHT, length: 50 },
        { type: SEG.FINISH, length: 15 }
      ]
    },
    // Level 4: Rotating tracks
    {
      name: '旋转挑战',
      baseSpeed: 2.2,
      trackWidth: 110,
      lowerTrackCount: 13,
      segments: [
        { type: SEG.STRAIGHT, length: 50 },
        { type: SEG.ROTATING, length: 55, rotateSpeed: 0.4 },
        { type: SEG.CURVE, length: 45, curve: -1.0 },
        { type: SEG.STRAIGHT, length: 40 },
        { type: SEG.TUNNEL, length: 55, signal: 'alternate', obstacles: [10, 22, 34, 46] },
        { type: SEG.STRAIGHT, length: 50 },
        { type: SEG.ROTATING, length: 50, rotateSpeed: -0.6 },
        { type: SEG.BOOST, length: 25, slope: 0.8 },
        { type: SEG.CURVE, length: 50, curve: 1.2 },
        { type: SEG.STRAIGHT, length: 40 },
        { type: SEG.ROTATING, length: 45, rotateSpeed: 0.7 },
        { type: SEG.STRAIGHT, length: 50 },
        { type: SEG.CURVE, length: 40, curve: -0.8 },
        { type: SEG.STRAIGHT, length: 40 },
        { type: SEG.FINISH, length: 15 }
      ]
    },
    // Level 5: Ultimate challenge
    {
      name: '终极考验',
      baseSpeed: 2.5,
      trackWidth: 105,
      lowerTrackCount: 15,
      segments: [
        { type: SEG.STRAIGHT, length: 40 },
        { type: SEG.CURVE, length: 40, curve: -1.2 },
        { type: SEG.TUNNEL, length: 55, signal: 'red', obstacles: [8, 18, 28, 38, 48] },
        { type: SEG.STRAIGHT, length: 40 },
        { type: SEG.ROTATING, length: 50, rotateSpeed: 0.8 },
        { type: SEG.BOOST, length: 20, slope: 1.2 },
        { type: SEG.CURVE, length: 45, curve: 1.5 },
        { type: SEG.STRAIGHT, length: 40 },
        { type: SEG.TUNNEL, length: 50, signal: 'alternate', obstacles: [8, 18, 28, 38] },
        { type: SEG.STRAIGHT, length: 30, slope: -0.6 },
        { type: SEG.ROTATING, length: 40, rotateSpeed: -1.0 },
        { type: SEG.CURVE, length: 40, curve: -1.5 },
        { type: SEG.BOOST, length: 25, slope: 1.5 },
        { type: SEG.STRAIGHT, length: 40 },
        { type: SEG.TUNNEL, length: 50, signal: 'red', obstacles: [6, 14, 22, 30, 38, 46] },
        { type: SEG.ROTATING, length: 30, rotateSpeed: 1.2 },
        { type: SEG.STRAIGHT, length: 40 },
        { type: SEG.FINISH, length: 15 }
      ]
    }
  ];

  function buildTrack(levelIndex, ballLevel) {
    const lvl = levels[Math.min(levelIndex, levels.length - 1)];
    const widthScale = 1 + (ballLevel - 1) * 0.15;
    const trackW = lvl.trackWidth * widthScale;
    const rows = [];
    let x = 0, y = 0, z = 0;

    for (const seg of lvl.segments) {
      for (let i = 0; i < seg.length; i++) {
        const curve = seg.curve || 0;
        const slope = seg.slope || 0;
        const row = {
          x, y, z,
          curve, slope,
          type: seg.type,
          trackWidth: trackW,
          wallHeight: seg.type === SEG.CURVE ? 40 : 12,
          isTunnel: seg.type === SEG.TUNNEL,
          isBoost: seg.type === SEG.BOOST,
          isRotating: seg.type === SEG.ROTATING,
          isFinish: seg.type === SEG.FINISH,
          rotateSpeed: seg.rotateSpeed || 0,
          signal: seg.signal || null,
          hasObstacle: false,
          obstacleX: 0
        };

        if (seg.type === SEG.TUNNEL && seg.obstacles) {
          if (seg.obstacles.includes(i)) {
            row.hasObstacle = true;
            row.obstacleX = (seg.obstacles.indexOf(i) % 2 === 0) ? -trackW * 0.25 : trackW * 0.25;
          }
        }

        if (seg.type === SEG.TUNNEL && i === 0) {
          row.signalLight = true;
        }

        rows.push(row);
        x += curve * 1.5;
        y += slope * 0.5;
        z += 1;
      }
    }

    // Build lower track layers - dense multi-layer system
    const lowerLayers = [];
    const layerCount = lvl.lowerTrackCount || 8;
    for (let layer = 0; layer < layerCount; layer++) {
      const lowerRows = [];
      const yOff = -(layer + 1) * 3.5;
      // Alternate left/right with varying offsets for dense look
      const angle = (layer * 2.39996); // golden angle spread
      const xDrift = Math.sin(angle) * (8 + layer * 3);
      for (let r = 0; r < rows.length; r++) {
        const orig = rows[r];
        lowerRows.push({
          ...orig,
          x: orig.x + xDrift + Math.sin(r * 0.02 + layer * 0.5) * (4 + layer),
          y: orig.y + yOff,
          hasObstacle: false,
          isTunnel: false,
          isRotating: false,
          isBoost: false,
          isFinish: orig.isFinish,
          wallHeight: 12,
          trackWidth: trackW * Math.max(0.4, 0.85 - layer * 0.03)
        });
      }
      lowerLayers.push(lowerRows);
    }

    return { rows, lowerLayers, trackWidth: trackW, levelData: lvl };
  }

  function getLevelCount() { return levels.length; }
  function getLevelName(i) { return levels[Math.min(i, levels.length - 1)].name; }
  function getBaseSpeed(i) { return levels[Math.min(i, levels.length - 1)].baseSpeed; }

  return { buildTrack, getLevelCount, getLevelName, getBaseSpeed, SEG };
})();
