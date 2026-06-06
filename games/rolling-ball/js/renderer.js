/**
 * Pseudo-3D renderer for the rolling ball track
 * Supports rendering multiple lower track layers
 */
const Renderer = (() => {
  let canvas, ctx;
  let W, H;
  const DRAW_DISTANCE = 120;
  const CAM_HEIGHT = 900;
  const CAM_DEPTH = 0.84;
  let frameCount = 0;

  function init(canvasEl) {
    canvas = canvasEl;
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
  }

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function project(worldX, worldY, worldZ, camX, camY, camZ) {
    const dx = worldX - camX;
    const dy = worldY - camY;
    const dz = worldZ - camZ;
    if (dz <= 0) return null;
    const scale = CAM_DEPTH / dz * H;
    return {
      x: W / 2 + dx * scale,
      y: H / 2 - dy * scale - (CAM_HEIGHT * CAM_DEPTH / dz),
      w: scale,
      scale: scale
    };
  }

  /**
   * Main render call
   * @param {Object} trackData - { rows, lowerLayers }
   * @param {number} position
   * @param {number} ballX
   * @param {number} ballRadius
   * @param {boolean} boosting
   * @param {number} ballLevel
   * @param {number} currentLayer - which layer the ball is on (0=top)
   * @param {number} fallProgress - 0..1 falling animation
   * @param {boolean} isFalling
   */
  function render(trackData, position, ballX, ballRadius, boosting, ballLevel, currentLayer, fallProgress, isFalling) {
    frameCount++;
    const posInt = Math.floor(position);

    drawSky();

    // Determine active rows based on layer
    const activeRows = currentLayer === 0
      ? trackData.rows
      : (trackData.lowerLayers[currentLayer - 1] || trackData.rows);

    const camRow = activeRows[Math.min(posInt, activeRows.length - 1)] || activeRows[0];
    const camX = camRow.x + ballX * 0.3;
    const camY = camRow.y + 2;
    const camZ = posInt - 2;

    const startRow = Math.min(posInt + DRAW_DISTANCE, activeRows.length - 1);
    const endRow = posInt;

    // Draw lower layers first (behind) - many layers, gradient alpha
    if (trackData.lowerLayers) {
      const totalLayers = trackData.lowerLayers.length;
      for (let li = totalLayers - 1; li >= 0; li--) {
        const layerRows = trackData.lowerLayers[li];
        const alpha = Math.max(0.1, 0.6 - li * (0.4 / totalLayers));
        drawTrackLayer(layerRows, posInt, startRow, endRow, camX, camY, camZ, alpha, li + 1);
      }
    }

    // Draw main (or current) layer
    if (currentLayer === 0) {
      drawTrackLayer(trackData.rows, posInt, startRow, endRow, camX, camY, camZ, 1.0, 0);
    } else {
      // Draw upper layer faded
      drawTrackLayer(trackData.rows, posInt, startRow, endRow, camX, camY, camZ, 0.2, -1);
      // Draw current layer full
      const curRows = trackData.lowerLayers[currentLayer - 1];
      if (curRows) {
        drawTrackLayer(curRows, posInt, startRow, endRow, camX, camY, camZ, 1.0, 0);
      }
    }

    // Draw ball
    let ballYOffset = 0;
    if (isFalling) {
      ballYOffset = fallProgress * 80;
    }
    drawBall(ballX, ballRadius, boosting, ballLevel, activeRows, posInt, camX, camY, camZ, ballYOffset, isFalling);

    if (boosting) drawSpeedLines();

    // Falling indicator
    if (isFalling) {
      drawFallIndicator(fallProgress);
    }
  }

  function drawTrackLayer(rows, posInt, startRow, endRow, camX, camY, camZ, alpha, layerIndex) {
    const actualStart = Math.min(startRow, rows.length - 1);
    const actualEnd = Math.max(endRow, 0);

    ctx.globalAlpha = alpha;

    for (let i = actualStart; i >= actualEnd; i--) {
      if (i < 0 || i >= rows.length - 1) continue;
      const row = rows[i];
      const nextRow = rows[i + 1] || row;

      const p1 = project(row.x, row.y, row.z, camX, camY, camZ);
      const p2 = project(nextRow.x, nextRow.y, nextRow.z, camX, camY, camZ);
      if (!p1 || !p2) continue;
      if (p1.y > H + 50 && p2.y > H + 50) continue;

      const tw = row.trackWidth;

      let rotOffset = 0;
      if (row.isRotating) {
        rotOffset = Math.sin(frameCount * row.rotateSpeed * 0.03) * tw * 0.3;
      }

      drawTrackSegment(p1, p2, tw, row, nextRow, i, rotOffset, layerIndex);
      drawRails(p1, p2, tw, row, rotOffset, layerIndex);

      if (row.wallHeight > 15) drawWalls(p1, p2, tw, row, rotOffset);
      if (i % 3 === 0) drawSleeper(p1, tw, rotOffset);
      if (row.isTunnel) drawTunnel(p1, p2, tw, row, rotOffset);
      if (row.signalLight) drawSignalLight(p1, tw, row, rotOffset);
      if (row.hasObstacle) drawObstacle(p1, row, tw, rotOffset);
      if (row.isBoost) drawBoostPad(p1, p2, tw, i, rotOffset);
      if (row.isFinish && i % 2 === 0) drawFinishLine(p1, tw, rotOffset);
    }

    ctx.globalAlpha = 1.0;
  }

  function drawSky() {
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#0a1628');
    grad.addColorStop(0.4, '#1a2a4a');
    grad.addColorStop(0.7, '#2d4a6e');
    grad.addColorStop(1, '#4a6a7a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (let i = 0; i < 60; i++) {
      const sx = (Math.sin(i * 127.1 + i) * 0.5 + 0.5) * W;
      const sy = (Math.sin(i * 311.7 + i * 3) * 0.5 + 0.5) * H * 0.5;
      const r = Math.sin(i * 17.3) * 0.8 + 1;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#1a2a3a';
    ctx.beginPath();
    ctx.moveTo(0, H * 0.55);
    for (let mx = 0; mx <= W; mx += 40) {
      const my = H * 0.55 - Math.sin(mx * 0.008) * 40 - Math.sin(mx * 0.015) * 20;
      ctx.lineTo(mx, my);
    }
    ctx.lineTo(W, H);
    ctx.lineTo(0, H);
    ctx.fill();
  }

  function drawTrackSegment(p1, p2, tw, row, nextRow, index, rotOffset, layerIndex) {
    const w1 = tw * p1.scale * 0.01;
    const w2 = tw * p2.scale * 0.01;

    let shade = row.isTunnel ? 0.35 : row.isBoost ? 0.7 : 0.5;
    // Lower layers have distinct tint
    if (layerIndex > 0) shade *= 0.6;
    if (layerIndex < 0) shade *= 0.3;

    const stripe = (index % 6 < 3) ? 0.05 : 0;
    const r = Math.floor((80 + stripe * 40) * shade);
    const g = Math.floor((90 + stripe * 40) * shade);
    const b = Math.floor((100 + stripe * 40) * shade);

    ctx.fillStyle = layerIndex > 0
      ? `rgb(${r + 20},${g},${b + 30})`
      : `rgb(${r},${g},${b})`;
    ctx.beginPath();
    ctx.moveTo(p1.x - w1 + rotOffset * p1.scale * 0.01, p1.y);
    ctx.lineTo(p1.x + w1 + rotOffset * p1.scale * 0.01, p1.y);
    ctx.lineTo(p2.x + w2 + rotOffset * p2.scale * 0.01, p2.y);
    ctx.lineTo(p2.x - w2 + rotOffset * p2.scale * 0.01, p2.y);
    ctx.fill();
  }

  function drawRails(p1, p2, tw, row, rotOffset, layerIndex) {
    const railW = 3;
    const positions = [-0.48, 0.48];
    const color = layerIndex > 0 ? '#8090a4' : '#b0b8c4';

    for (const pos of positions) {
      const rx1 = p1.x + tw * pos * p1.scale * 0.01 + rotOffset * p1.scale * 0.01;
      const rx2 = p2.x + tw * pos * p2.scale * 0.01 + rotOffset * p2.scale * 0.01;

      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1, railW * p1.scale * 0.005);
      ctx.beginPath();
      ctx.moveTo(rx1, p1.y);
      ctx.lineTo(rx2, p2.y);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(200,210,225,0.3)';
      ctx.lineWidth = Math.max(0.5, 1 * p1.scale * 0.005);
      ctx.beginPath();
      ctx.moveTo(rx1 - 1, p1.y);
      ctx.lineTo(rx2 - 1, p2.y);
      ctx.stroke();
    }
  }

  function drawWalls(p1, p2, tw, row, rotOffset) {
    const wallH = row.wallHeight * p1.scale * 0.008;
    const positions = [-0.5, 0.5];
    for (const pos of positions) {
      const wx = p1.x + tw * pos * p1.scale * 0.01 + rotOffset * p1.scale * 0.01;
      ctx.fillStyle = pos < 0 ? 'rgba(100,110,130,0.7)' : 'rgba(80,90,110,0.7)';
      ctx.fillRect(wx - 2, p1.y - wallH, 4, wallH);
      ctx.fillStyle = 'rgba(180,190,210,0.5)';
      ctx.fillRect(wx - 2, p1.y - wallH, 4, 2);
    }
  }

  function drawSleeper(p1, tw, rotOffset) {
    const w = tw * p1.scale * 0.01;
    const cx = p1.x + rotOffset * p1.scale * 0.01;
    const sleeperH = Math.max(1, 2 * p1.scale * 0.005);
    ctx.fillStyle = '#5a4a3a';
    ctx.fillRect(cx - w, p1.y - 1, w * 2, sleeperH);
  }

  function drawTunnel(p1, p2, tw, row, rotOffset) {
    const w = tw * p1.scale * 0.01;
    const cx = p1.x + rotOffset * p1.scale * 0.01;
    const tunnelH = 50 * p1.scale * 0.008;
    ctx.fillStyle = 'rgba(20,25,35,0.85)';
    ctx.fillRect(cx - w * 1.1, p1.y - tunnelH, w * 2.2, tunnelH * 0.3);
    ctx.fillStyle = 'rgba(30,35,50,0.7)';
    ctx.fillRect(cx - w * 1.1, p1.y - tunnelH, 4, tunnelH);
    ctx.fillRect(cx + w * 1.1 - 4, p1.y - tunnelH, 4, tunnelH);
    if (Math.random() < 0.15) {
      ctx.fillStyle = '#ffcc44';
      ctx.shadowColor = '#ffcc44';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(cx, p1.y - tunnelH + 8, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  function drawSignalLight(p1, tw, row, rotOffset) {
    const cx = p1.x + rotOffset * p1.scale * 0.01;
    const lightY = p1.y - 60 * p1.scale * 0.008;
    const lightR = Math.max(4, 8 * p1.scale * 0.006);
    let isRed = false;
    if (row.signal === 'red') isRed = true;
    else if (row.signal === 'alternate') isRed = Math.floor(frameCount / 90) % 2 === 0;

    ctx.fillStyle = '#444';
    ctx.fillRect(cx - 2, lightY, 4, p1.y - lightY);
    ctx.fillStyle = '#222';
    ctx.fillRect(cx - lightR - 4, lightY - lightR * 3, (lightR + 4) * 2, lightR * 6);

    ctx.fillStyle = isRed ? '#ff3333' : '#661111';
    ctx.shadowColor = isRed ? '#ff3333' : 'transparent';
    ctx.shadowBlur = isRed ? 15 : 0;
    ctx.beginPath();
    ctx.arc(cx, lightY - lightR, lightR, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = !isRed ? '#33ff33' : '#116611';
    ctx.shadowColor = !isRed ? '#33ff33' : 'transparent';
    ctx.shadowBlur = !isRed ? 15 : 0;
    ctx.beginPath();
    ctx.arc(cx, lightY + lightR, lightR, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  function drawObstacle(p1, row, tw, rotOffset) {
    const obstW = 20 * p1.scale * 0.01;
    const obstH = 25 * p1.scale * 0.008;
    const ox = p1.x + row.obstacleX * p1.scale * 0.01 + rotOffset * p1.scale * 0.01;
    ctx.fillStyle = '#cc3333';
    ctx.fillRect(ox - obstW, p1.y - obstH, obstW * 2, obstH);
    ctx.fillStyle = '#ffcc00';
    for (let s = 0; s < 3; s++) {
      ctx.fillRect(ox - obstW + s * obstW * 0.7, p1.y - obstH, obstW * 0.3, obstH);
    }
    ctx.fillStyle = '#aa2222';
    ctx.fillRect(ox - obstW - 2, p1.y - obstH - 3, obstW * 2 + 4, 3);
  }

  function drawBoostPad(p1, p2, tw, index, rotOffset) {
    const w = tw * 0.3 * p1.scale * 0.01;
    const cx = p1.x + rotOffset * p1.scale * 0.01;
    const phase = (frameCount + index * 5) % 30;
    const alpha = 0.4 + Math.sin(phase * 0.2) * 0.3;
    ctx.fillStyle = `rgba(255,200,0,${alpha})`;
    ctx.beginPath();
    ctx.moveTo(cx, p1.y - 8 * p1.scale * 0.008);
    ctx.lineTo(cx - w * 0.4, p1.y);
    ctx.lineTo(cx + w * 0.4, p1.y);
    ctx.fill();
    ctx.shadowColor = '#ffcc00';
    ctx.shadowBlur = 10;
    ctx.strokeStyle = `rgba(255,180,0,${alpha * 0.6})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.3, p1.y + 2);
    ctx.lineTo(cx + w * 0.3, p1.y + 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  function drawFinishLine(p1, tw, rotOffset) {
    const w = tw * p1.scale * 0.01;
    const cx = p1.x + rotOffset * p1.scale * 0.01;
    const h = 4;
    const cols = 8;
    const colW = w * 2 / cols;
    for (let c = 0; c < cols; c++) {
      ctx.fillStyle = c % 2 === 0 ? '#fff' : '#222';
      ctx.fillRect(cx - w + c * colW, p1.y - h, colW, h);
    }
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, p1.y, w * 0.5, Math.PI, 0);
    ctx.stroke();
  }

  function drawBall(ballX, radius, boosting, ballLevel, rows, posInt, camX, camY, camZ, yOffset, isFalling) {
    const row = rows[Math.min(posInt + 3, rows.length - 1)];
    if (!row) return;

    const p = project(row.x + ballX, row.y + radius * 0.08, row.z, camX, camY, camZ);
    if (!p) return;

    const r = radius * p.scale * 0.012;
    const bx = p.x;
    const by = p.y - r + yOffset;

    // Shadow
    if (!isFalling) {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(bx, p.y + 2, r * 1.2, r * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Ball body - metallic gradient
    const ballAlpha = isFalling ? 0.7 : 1.0;
    ctx.globalAlpha = ballAlpha;

    const grad = ctx.createRadialGradient(bx - r * 0.3, by - r * 0.3, r * 0.1, bx, by, r);
    grad.addColorStop(0, '#eee');
    grad.addColorStop(0.3, '#bbb');
    grad.addColorStop(0.7, '#777');
    grad.addColorStop(1, '#444');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(bx, by, r, 0, Math.PI * 2);
    ctx.fill();

    // Specular highlight
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    ctx.arc(bx - r * 0.25, by - r * 0.25, r * 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Edge rim
    ctx.strokeStyle = 'rgba(180,200,220,0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(bx, by, r, -0.3, 1.2);
    ctx.stroke();

    // Level rings
    if (ballLevel > 1) {
      ctx.strokeStyle = `rgba(255,200,50,${0.3 + Math.sin(frameCount * 0.05) * 0.15})`;
      ctx.lineWidth = 1;
      for (let ring = 1; ring < ballLevel && ring < 5; ring++) {
        ctx.beginPath();
        ctx.arc(bx, by, r + ring * 3, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Boost glow
    if (boosting) {
      ctx.shadowColor = '#ff8800';
      ctx.shadowBlur = 20;
      ctx.strokeStyle = 'rgba(255,150,0,0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(bx, by, r + 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    ctx.globalAlpha = 1.0;
  }

  function drawSpeedLines() {
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 12; i++) {
      const lx = W * 0.3 + Math.random() * W * 0.4;
      const ly = H * 0.3 + Math.random() * H * 0.4;
      const len = 20 + Math.random() * 40;
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(lx, ly + len);
      ctx.stroke();
    }
  }

  function drawFallIndicator(progress) {
    const txt = progress < 0.8 ? '坠落中...' : '幸运着陆？';
    ctx.fillStyle = `rgba(255,100,50,${0.5 + Math.sin(frameCount * 0.15) * 0.3})`;
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(txt, W / 2, H / 2 + 50);
  }

  return { init, render, resize };
})();
