import { useEffect, useRef, useCallback, useState } from 'react';
import {
  type Player, type Enemy, type Bullet, type Particle,
  type PowerUp, type BGElement, type GameData,
  CANVAS_WIDTH, CANVAS_HEIGHT
} from './types';

// ===== HELPERS =====
const rand = (min: number, max: number) => Math.random() * (max - min) + min;
const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1));

function collides(a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number }) {
  return a.x < b.x + b.width && a.x + a.width > b.x &&
    a.y < b.y + b.height && a.y + a.height > b.y;
}

// ===== INITIAL STATE =====
function createPlayer(): Player {
  return {
    x: CANVAS_WIDTH / 2 - 20, y: CANVAS_HEIGHT - 100,
    width: 40, height: 40, speed: 5, lives: 3,
    bombs: 3, firepower: 1, invincible: 120,
    score: 0, shootCooldown: 0
  };
}

function createBGElements(): BGElement[] {
  const els: BGElement[] = [];
  for (let i = 0; i < 15; i++) {
    els.push({
      x: rand(0, CANVAS_WIDTH), y: rand(-CANVAS_HEIGHT, CANVAS_HEIGHT),
      width: rand(20, 60), height: rand(10, 30),
      speed: rand(0.3, 1), opacity: rand(0.1, 0.3), type: randInt(0, 2)
    });
  }
  return els;
}

function initGame(highScore: number): GameData {
  return {
    state: 'menu', player: createPlayer(),
    enemies: [], bullets: [], particles: [], powerUps: [],
    bgElements: createBGElements(), wave: 0,
    waveTimer: 0, waveDelay: 180, bgOffset: 0,
    highScore, shakeTimer: 0, flashTimer: 0,
    bombActive: 0, combo: 0, comboTimer: 0
  };
}

// ===== SPAWN ENEMIES =====
function spawnWave(game: GameData) {
  const w = game.wave;
  const isBoss = w > 0 && w % 5 === 0;

  if (isBoss) {
    game.enemies.push({
      x: CANVAS_WIDTH / 2 - 50, y: -120,
      width: 100, height: 80, speed: 0.8,
      health: 30 + w * 5, maxHealth: 30 + w * 5,
      type: 3, shootTimer: 0, shootInterval: 30,
      movePattern: 3, moveTimer: 0, startX: CANVAS_WIDTH / 2 - 50,
      scoreValue: 3000
    });
  } else {
    const count = Math.min(3 + Math.floor(w / 2), 12);
    for (let i = 0; i < count; i++) {
      const type = w < 3 ? 0 : (Math.random() < 0.3 ? 1 : (Math.random() < 0.1 && w > 5 ? 2 : 0));
      const size = type === 0 ? 30 : type === 1 ? 40 : 50;
      const hp = type === 0 ? 1 : type === 1 ? 3 : 6;
      const spd = type === 0 ? rand(1.5, 3) : type === 1 ? rand(1, 2) : rand(0.5, 1.2);
      const sx = rand(20, CANVAS_WIDTH - 20 - size);
      game.enemies.push({
        x: sx, y: -size - i * 60,
        width: size, height: size, speed: spd + w * 0.05,
        health: hp + Math.floor(w / 3), maxHealth: hp + Math.floor(w / 3),
        type, shootTimer: rand(60, 180),
        shootInterval: type === 0 ? 200 : type === 1 ? 120 : 80,
        movePattern: randInt(0, 2), moveTimer: 0, startX: sx,
        scoreValue: type === 0 ? 100 : type === 1 ? 300 : 500
      });
    }
  }
}

// ===== DRAWING =====
function drawBG(ctx: CanvasRenderingContext2D, game: GameData) {
  // Ocean gradient
  const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
  grad.addColorStop(0, '#1a2a4a');
  grad.addColorStop(0.5, '#1e3a5f');
  grad.addColorStop(1, '#0d1b2a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Water waves
  const off = game.bgOffset;
  ctx.strokeStyle = 'rgba(100,180,255,0.08)';
  ctx.lineWidth = 1;
  for (let row = 0; row < 20; row++) {
    const yy = ((row * 50 + off * 0.5) % (CANVAS_HEIGHT + 100)) - 50;
    ctx.beginPath();
    for (let x = 0; x <= CANVAS_WIDTH; x += 5) {
      const y = yy + Math.sin(x * 0.02 + off * 0.01 + row) * 8;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // BG clouds/islands
  game.bgElements.forEach(el => {
    ctx.globalAlpha = el.opacity;
    if (el.type === 0) {
      // Cloud
      ctx.fillStyle = '#4a6a8a';
      ctx.beginPath();
      ctx.ellipse(el.x + el.width / 2, el.y + el.height / 2, el.width / 2, el.height / 2, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (el.type === 1) {
      // Island
      ctx.fillStyle = '#2a4a2a';
      ctx.beginPath();
      ctx.ellipse(el.x + el.width / 2, el.y + el.height / 2, el.width / 2, el.height / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3a5a3a';
      ctx.beginPath();
      ctx.ellipse(el.x + el.width / 2 - 5, el.y + el.height / 2 - 3, el.width / 3, el.height / 3, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Small island
      ctx.fillStyle = '#3a3a2a';
      ctx.beginPath();
      ctx.ellipse(el.x + el.width / 2, el.y + el.height / 2, el.width / 3, el.height / 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  });
}

function drawPlayer(ctx: CanvasRenderingContext2D, p: Player, frame: number) {
  if (p.invincible > 0 && Math.floor(p.invincible / 4) % 2 === 0) return;

  ctx.save();
  ctx.translate(p.x + p.width / 2, p.y + p.height / 2);

  // Engine glow
  const glowSize = 6 + Math.sin(frame * 0.3) * 3;
  ctx.fillStyle = '#ff6600';
  ctx.beginPath();
  ctx.ellipse(0, p.height / 2 + 2, 5, glowSize, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffcc00';
  ctx.beginPath();
  ctx.ellipse(0, p.height / 2, 3, glowSize * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body
  ctx.fillStyle = '#3a8a3a';
  ctx.beginPath();
  ctx.moveTo(0, -p.height / 2);
  ctx.lineTo(-p.width / 2, p.height / 2);
  ctx.lineTo(-p.width / 6, p.height / 3);
  ctx.lineTo(0, p.height / 2.5);
  ctx.lineTo(p.width / 6, p.height / 3);
  ctx.lineTo(p.width / 2, p.height / 2);
  ctx.closePath();
  ctx.fill();

  // Cockpit
  ctx.fillStyle = '#66ccff';
  ctx.beginPath();
  ctx.ellipse(0, -2, 5, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Wings
  ctx.fillStyle = '#2a6a2a';
  ctx.fillRect(-p.width / 2 - 3, 2, p.width + 6, 5);

  // Wing tips
  ctx.fillStyle = '#cc0000';
  ctx.fillRect(-p.width / 2 - 5, 2, 4, 5);
  ctx.fillRect(p.width / 2 + 1, 2, 4, 5);

  ctx.restore();
}

function drawEnemy(ctx: CanvasRenderingContext2D, e: Enemy, frame: number) {
  ctx.save();
  ctx.translate(e.x + e.width / 2, e.y + e.height / 2);

  if (e.type === 3) {
    // Boss
    // Body
    ctx.fillStyle = '#8a2a2a';
    ctx.beginPath();
    ctx.moveTo(0, e.height / 2);
    ctx.lineTo(-e.width / 2, -e.height / 4);
    ctx.lineTo(-e.width / 3, -e.height / 2);
    ctx.lineTo(0, -e.height / 3);
    ctx.lineTo(e.width / 3, -e.height / 2);
    ctx.lineTo(e.width / 2, -e.height / 4);
    ctx.closePath();
    ctx.fill();

    // Wings
    ctx.fillStyle = '#6a1a1a';
    ctx.fillRect(-e.width / 2 - 5, -5, e.width + 10, 8);

    // Cockpit
    ctx.fillStyle = '#ffaa00';
    ctx.beginPath();
    ctx.ellipse(0, 5, 8, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Engines
    const eg = 4 + Math.sin(frame * 0.4) * 2;
    ctx.fillStyle = '#ff4400';
    ctx.beginPath();
    ctx.ellipse(-20, -e.height / 2 - 2, 4, eg, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(20, -e.height / 2 - 2, 4, eg, 0, 0, Math.PI * 2);
    ctx.fill();

    // Health bar
    ctx.fillStyle = '#333';
    ctx.fillRect(-30, -e.height / 2 - 15, 60, 6);
    ctx.fillStyle = e.health / e.maxHealth > 0.3 ? '#00cc00' : '#cc0000';
    ctx.fillRect(-30, -e.height / 2 - 15, 60 * (e.health / e.maxHealth), 6);
  } else {
    // Regular enemies
    const colors = ['#aa3333', '#aa6633', '#8833aa'];
    const color = colors[e.type] || colors[0];
    const darkColor = e.type === 0 ? '#882222' : e.type === 1 ? '#884422' : '#662288';

    // Body
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, e.height / 2);
    ctx.lineTo(-e.width / 2, -e.height / 3);
    ctx.lineTo(-e.width / 4, -e.height / 2);
    ctx.lineTo(e.width / 4, -e.height / 2);
    ctx.lineTo(e.width / 2, -e.height / 3);
    ctx.closePath();
    ctx.fill();

    // Wings
    ctx.fillStyle = darkColor;
    ctx.fillRect(-e.width / 2, -2, e.width, 4);

    // Cockpit
    ctx.fillStyle = '#ffcc00';
    ctx.beginPath();
    ctx.arc(0, 2, e.width / 6, 0, Math.PI * 2);
    ctx.fill();

    if (e.type >= 1 && e.maxHealth > 1) {
      // Health bar for medium+ enemies
      ctx.fillStyle = '#333';
      ctx.fillRect(-e.width / 2, -e.height / 2 - 8, e.width, 4);
      ctx.fillStyle = '#00cc00';
      ctx.fillRect(-e.width / 2, -e.height / 2 - 8, e.width * (e.health / e.maxHealth), 4);
    }
  }

  ctx.restore();
}

function drawBullet(ctx: CanvasRenderingContext2D, b: Bullet, frame: number) {
  if (b.isEnemy) {
    ctx.fillStyle = '#ff4444';
    ctx.beginPath();
    ctx.arc(b.x + b.width / 2, b.y + b.height / 2, b.width / 2 + Math.sin(frame * 0.5) * 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffaa44';
    ctx.beginPath();
    ctx.arc(b.x + b.width / 2, b.y + b.height / 2, b.width / 3, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = '#44ff44';
    ctx.shadowColor = '#44ff44';
    ctx.shadowBlur = 6;
    ctx.fillRect(b.x, b.y, b.width, b.height);
    ctx.fillStyle = '#aaffaa';
    ctx.fillRect(b.x + 1, b.y + 1, b.width - 2, b.height - 2);
    ctx.shadowBlur = 0;
  }
}

function drawPowerUp(ctx: CanvasRenderingContext2D, pu: PowerUp, frame: number) {
  const pulse = Math.sin(frame * 0.1) * 3;
  const colors = ['#44aaff', '#ff8844', '#44ff44'];
  const labels = ['P', 'B', '♥'];

  ctx.fillStyle = colors[pu.type];
  ctx.globalAlpha = 0.3;
  ctx.beginPath();
  ctx.arc(pu.x + pu.width / 2, pu.y + pu.height / 2, pu.width / 2 + pulse + 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.fillStyle = '#222';
  ctx.beginPath();
  ctx.arc(pu.x + pu.width / 2, pu.y + pu.height / 2, pu.width / 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = colors[pu.type];
  ctx.strokeStyle = colors[pu.type];
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(pu.x + pu.width / 2, pu.y + pu.height / 2, pu.width / 2, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(labels[pu.type], pu.x + pu.width / 2, pu.y + pu.height / 2);
}

function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  particles.forEach(p => {
    const alpha = p.life / p.maxLife;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

function drawHUD(ctx: CanvasRenderingContext2D, game: GameData) {
  const p = game.player;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, 36);

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 14px "Courier New", monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`SCORE: ${p.score.toString().padStart(8, '0')}`, 8, 15);

  ctx.textAlign = 'right';
  ctx.fillText(`HI: ${game.highScore.toString().padStart(8, '0')}`, CANVAS_WIDTH - 8, 15);

  // Lives
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ff4444';
  ctx.font = '14px Arial';
  for (let i = 0; i < p.lives; i++) {
    ctx.fillText('❤️', 8 + i * 20, 32);
  }

  // Bombs
  ctx.fillStyle = '#ffaa00';
  ctx.textAlign = 'right';
  for (let i = 0; i < p.bombs; i++) {
    ctx.fillText('💣', CANVAS_WIDTH - 8 - i * 22, 32);
  }

  // Wave
  ctx.fillStyle = '#aaa';
  ctx.font = '12px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`WAVE ${game.wave}`, CANVAS_WIDTH / 2, 32);

  // Combo
  if (game.combo > 1 && game.comboTimer > 0) {
    const alpha = Math.min(1, game.comboTimer / 30);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#ffdd00';
    ctx.font = `bold ${16 + game.combo}px "Courier New", monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(`${game.combo}x COMBO!`, CANVAS_WIDTH / 2, 60);
    ctx.globalAlpha = 1;
  }
}

function drawMenu(ctx: CanvasRenderingContext2D, frame: number, highScore: number) {
  // Title
  ctx.fillStyle = '#ffcc00';
  ctx.font = 'bold 56px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = '#ff6600';
  ctx.shadowBlur = 20;
  ctx.fillText('1942', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 120);
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#aaccff';
  ctx.font = 'bold 18px "Courier New", monospace';
  ctx.fillText('经典打飞机', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 70);

  // Flashing start text
  if (Math.floor(frame / 30) % 2 === 0) {
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px "Courier New", monospace';
    ctx.fillText('点击开始游戏', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 10);
  }

  // Controls
  ctx.fillStyle = '#889';
  ctx.font = '13px "Courier New", monospace';
  const instructions = [
    '↑ ↓ ← → / WASD  移动',
    'SPACE  射击',
    'B  炸弹（清屏）',
    'P  暂停',
  ];
  instructions.forEach((t, i) => {
    ctx.fillText(t, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 70 + i * 24);
  });

  ctx.fillStyle = '#ffaa00';
  ctx.font = '14px "Courier New", monospace';
  ctx.fillText('📱 触屏：滑动移动，点击射击', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 180);

  if (highScore > 0) {
    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 16px "Courier New", monospace';
    ctx.fillText(`最高分: ${highScore}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 220);
  }
}

function drawGameOver(ctx: CanvasRenderingContext2D, game: GameData, frame: number) {
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.fillStyle = '#ff4444';
  ctx.font = 'bold 42px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('GAME OVER', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 80);

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 20px "Courier New", monospace';
  ctx.fillText(`最终得分: ${game.player.score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);

  ctx.fillStyle = '#ffcc00';
  ctx.font = '16px "Courier New", monospace';
  ctx.fillText(`到达波次: ${game.wave}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);

  if (game.player.score >= game.highScore && game.player.score > 0) {
    ctx.fillStyle = '#ffdd00';
    ctx.font = 'bold 18px "Courier New", monospace';
    ctx.fillText('🏆 新纪录！', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 60);
  }

  if (Math.floor(frame / 30) % 2 === 0) {
    ctx.fillStyle = '#aaa';
    ctx.font = '16px "Courier New", monospace';
    ctx.fillText('点击重新开始', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 110);
  }
}

function drawPaused(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 36px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('暂停', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
  ctx.font = '16px "Courier New", monospace';
  ctx.fillText('按 P 继续', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 40);
}

// ===== EXPLOSIONS =====
function spawnExplosion(particles: Particle[], x: number, y: number, count: number, big: boolean) {
  const colors = ['#ff4400', '#ff8800', '#ffcc00', '#ff2200', '#ffaa00'];
  for (let i = 0; i < count; i++) {
    const angle = rand(0, Math.PI * 2);
    const speed = rand(big ? 1 : 0.5, big ? 5 : 3);
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: rand(20, big ? 60 : 40),
      maxLife: 60,
      color: colors[randInt(0, colors.length - 1)],
      size: rand(big ? 3 : 2, big ? 8 : 5)
    });
  }
  // Smoke
  for (let i = 0; i < count / 2; i++) {
    const angle = rand(0, Math.PI * 2);
    const speed = rand(0.3, 1.5);
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: rand(30, 70),
      maxLife: 70,
      color: '#555',
      size: rand(3, big ? 10 : 6)
    });
  }
}

// ===== GAME COMPONENT =====
export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameData>(initGame(parseInt(localStorage.getItem('1942_highscore') || '0')));
  const keysRef = useRef<Set<string>>(new Set());
  const frameRef = useRef(0);
  const rafRef = useRef<number>(0);
  const touchRef = useRef<{ active: boolean; startX: number; startY: number; currentX: number; currentY: number; shooting: boolean }>({
    active: false, startX: 0, startY: 0, currentX: 0, currentY: 0, shooting: false
  });
  const [scale, setScale] = useState(1);
  const autoShootRef = useRef(true);

  const handleResize = useCallback(() => {
    const maxH = window.innerHeight - 20;
    const maxW = window.innerWidth - 20;
    const s = Math.min(maxW / CANVAS_WIDTH, maxH / CANVAS_HEIGHT, 1.5);
    setScale(s);
  }, []);

  useEffect(() => {
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  // ===== GAME LOOP =====
  const update = useCallback(() => {
    const game = gameRef.current;
    const keys = keysRef.current;
    const touch = touchRef.current;

    if (game.state !== 'playing') return;

    const p = game.player;

    // Player movement
    let dx = 0, dy = 0;
    if (keys.has('ArrowLeft') || keys.has('a')) dx -= 1;
    if (keys.has('ArrowRight') || keys.has('d')) dx += 1;
    if (keys.has('ArrowUp') || keys.has('w')) dy -= 1;
    if (keys.has('ArrowDown') || keys.has('s')) dy += 1;

    // Touch movement
    if (touch.active) {
      const tdx = touch.currentX - touch.startX;
      const tdy = touch.currentY - touch.startY;
      const dist = Math.sqrt(tdx * tdx + tdy * tdy);
      if (dist > 5) {
        dx += tdx / dist;
        dy += tdy / dist;
        // Move touch start toward current for smooth dragging
        touch.startX += tdx * 0.3;
        touch.startY += tdy * 0.3;
      }
    }

    if (dx !== 0 || dy !== 0) {
      const len = Math.sqrt(dx * dx + dy * dy);
      p.x += (dx / len) * p.speed;
      p.y += (dy / len) * p.speed;
    }

    // Clamp player position
    p.x = Math.max(0, Math.min(CANVAS_WIDTH - p.width, p.x));
    p.y = Math.max(36, Math.min(CANVAS_HEIGHT - p.height, p.y));

    // Invincibility timer
    if (p.invincible > 0) p.invincible--;

    // Shooting
    if (p.shootCooldown > 0) p.shootCooldown--;
    const shooting = keys.has(' ') || keys.has('Space') || autoShootRef.current || touch.shooting;
    if (shooting && p.shootCooldown <= 0) {
      const cx = p.x + p.width / 2;
      const cy = p.y;
      const cooldown = Math.max(5, 12 - p.firepower);
      p.shootCooldown = cooldown;

      const bw = 4, bh = 12;
      if (p.firepower >= 5) {
        game.bullets.push({ x: cx - 2, y: cy - 5, width: bw, height: bh, vx: 0, vy: -10, isEnemy: false, damage: 2 });
        game.bullets.push({ x: cx - 15, y: cy, width: bw, height: bh, vx: -1, vy: -9, isEnemy: false, damage: 1 });
        game.bullets.push({ x: cx + 11, y: cy, width: bw, height: bh, vx: 1, vy: -9, isEnemy: false, damage: 1 });
        game.bullets.push({ x: cx - 25, y: cy + 5, width: bw, height: bh, vx: -2, vy: -8, isEnemy: false, damage: 1 });
        game.bullets.push({ x: cx + 21, y: cy + 5, width: bw, height: bh, vx: 2, vy: -8, isEnemy: false, damage: 1 });
      } else if (p.firepower >= 4) {
        game.bullets.push({ x: cx - 8, y: cy - 5, width: bw, height: bh, vx: 0, vy: -10, isEnemy: false, damage: 1 });
        game.bullets.push({ x: cx + 4, y: cy - 5, width: bw, height: bh, vx: 0, vy: -10, isEnemy: false, damage: 1 });
        game.bullets.push({ x: cx - 18, y: cy, width: bw, height: bh, vx: -1, vy: -9, isEnemy: false, damage: 1 });
        game.bullets.push({ x: cx + 14, y: cy, width: bw, height: bh, vx: 1, vy: -9, isEnemy: false, damage: 1 });
      } else if (p.firepower >= 3) {
        game.bullets.push({ x: cx - 2, y: cy - 5, width: bw, height: bh, vx: 0, vy: -10, isEnemy: false, damage: 1 });
        game.bullets.push({ x: cx - 15, y: cy, width: bw, height: bh, vx: -1.5, vy: -9, isEnemy: false, damage: 1 });
        game.bullets.push({ x: cx + 11, y: cy, width: bw, height: bh, vx: 1.5, vy: -9, isEnemy: false, damage: 1 });
      } else if (p.firepower >= 2) {
        game.bullets.push({ x: cx - 8, y: cy - 5, width: bw, height: bh, vx: 0, vy: -10, isEnemy: false, damage: 1 });
        game.bullets.push({ x: cx + 4, y: cy - 5, width: bw, height: bh, vx: 0, vy: -10, isEnemy: false, damage: 1 });
      } else {
        game.bullets.push({ x: cx - 2, y: cy - 5, width: bw, height: bh, vx: 0, vy: -10, isEnemy: false, damage: 1 });
      }
    }

    // Bomb
    if (game.bombActive > 0) {
      game.bombActive--;
      // Damage all enemies
      game.enemies.forEach(e => {
        e.health -= 0.5;
        if (e.health <= 0) {
          spawnExplosion(game.particles, e.x + e.width / 2, e.y + e.height / 2, e.type === 3 ? 40 : 15, e.type === 3);
          p.score += e.scoreValue;
        }
      });
      game.enemies = game.enemies.filter(e => e.health > 0);
      game.bullets = game.bullets.filter(b => !b.isEnemy);
    }

    // Update BG
    game.bgOffset += 1;
    game.bgElements.forEach(el => {
      el.y += el.speed;
      if (el.y > CANVAS_HEIGHT + 50) {
        el.y = -50;
        el.x = rand(0, CANVAS_WIDTH);
      }
    });

    // Wave management
    if (game.enemies.length === 0 && game.waveTimer <= 0) {
      game.waveTimer = game.waveDelay;
    }
    if (game.waveTimer > 0) {
      game.waveTimer--;
      if (game.waveTimer === 0) {
        game.wave++;
        spawnWave(game);
      }
    }

    // Update enemies
    game.enemies.forEach(e => {
      e.moveTimer++;

      // Movement patterns
      if (e.type === 3) {
        // Boss movement
        e.y = Math.min(e.y + e.speed, 50);
        e.x = CANVAS_WIDTH / 2 - e.width / 2 + Math.sin(e.moveTimer * 0.02) * (CANVAS_WIDTH / 2 - e.width / 2 - 20);
      } else if (e.movePattern === 0) {
        // Straight down
        e.y += e.speed;
      } else if (e.movePattern === 1) {
        // Sine wave
        e.y += e.speed;
        e.x = e.startX + Math.sin(e.moveTimer * 0.03) * 60;
      } else {
        // Zigzag
        e.y += e.speed;
        e.x = e.startX + Math.sin(e.moveTimer * 0.05) * 40;
      }

      // Clamp x
      e.x = Math.max(0, Math.min(CANVAS_WIDTH - e.width, e.x));

      // Enemy shooting
      e.shootTimer--;
      if (e.shootTimer <= 0 && e.y > 0) {
        e.shootTimer = e.shootInterval;

        if (e.type === 3) {
          // Boss shoots in patterns
          const pattern = Math.floor(e.moveTimer / 120) % 3;
          if (pattern === 0) {
            // Spread
            for (let i = -2; i <= 2; i++) {
              game.bullets.push({
                x: e.x + e.width / 2 - 4, y: e.y + e.height,
                width: 8, height: 8, vx: i * 1.5, vy: 4,
                isEnemy: true, damage: 1
              });
            }
          } else if (pattern === 1) {
            // Aimed
            const angle = Math.atan2(p.y - e.y - e.height, p.x + p.width / 2 - e.x - e.width / 2);
            game.bullets.push({
              x: e.x + e.width / 2 - 4, y: e.y + e.height,
              width: 8, height: 8,
              vx: Math.cos(angle) * 5, vy: Math.sin(angle) * 5,
              isEnemy: true, damage: 1
            });
          } else {
            // Dual
            game.bullets.push({
              x: e.x + 10, y: e.y + e.height,
              width: 6, height: 6, vx: -1, vy: 5,
              isEnemy: true, damage: 1
            });
            game.bullets.push({
              x: e.x + e.width - 16, y: e.y + e.height,
              width: 6, height: 6, vx: 1, vy: 5,
              isEnemy: true, damage: 1
            });
          }
        } else if (e.type >= 1) {
          // Medium/large enemies aim at player
          const angle = Math.atan2(p.y - e.y, p.x + p.width / 2 - e.x - e.width / 2);
          game.bullets.push({
            x: e.x + e.width / 2 - 3, y: e.y + e.height,
            width: 6, height: 6,
            vx: Math.cos(angle) * 3.5, vy: Math.sin(angle) * 3.5,
            isEnemy: true, damage: 1
          });
        }
      }
    });

    // Remove off-screen enemies
    game.enemies = game.enemies.filter(e => e.y < CANVAS_HEIGHT + 50 && e.y > -200);

    // Update bullets
    game.bullets.forEach(b => {
      b.x += b.vx;
      b.y += b.vy;
    });
    game.bullets = game.bullets.filter(b =>
      b.x > -20 && b.x < CANVAS_WIDTH + 20 && b.y > -20 && b.y < CANVAS_HEIGHT + 20
    );

    // Bullet-enemy collisions
    game.bullets = game.bullets.filter(b => {
      if (b.isEnemy) return true;
      let hit = false;
      game.enemies.forEach(e => {
        if (!hit && collides(b, e)) {
          hit = true;
          e.health -= b.damage;
          // Small hit particles
          game.particles.push({
            x: b.x, y: b.y, vx: rand(-1, 1), vy: rand(-1, 1),
            life: 10, maxLife: 10, color: '#fff', size: 2
          });
          if (e.health <= 0) {
            spawnExplosion(game.particles, e.x + e.width / 2, e.y + e.height / 2,
              e.type === 3 ? 50 : e.type >= 1 ? 25 : 12, e.type >= 2);
            p.score += e.scoreValue * (1 + Math.floor(game.combo / 3));
            game.combo++;
            game.comboTimer = 90;
            game.shakeTimer = e.type === 3 ? 20 : 5;

            // Drop power-up
            const dropChance = e.type === 3 ? 1 : e.type >= 1 ? 0.4 : 0.15;
            if (Math.random() < dropChance) {
              const puType = e.type === 3 ? randInt(0, 2) : (Math.random() < 0.6 ? 0 : (Math.random() < 0.5 ? 1 : 2));
              game.powerUps.push({
                x: e.x + e.width / 2 - 12, y: e.y + e.height / 2 - 12,
                width: 24, height: 24, type: puType, vy: 1.5
              });
            }
          }
        }
      });
      return !hit;
    });
    game.enemies = game.enemies.filter(e => e.health > 0);

    // Combo timer
    if (game.comboTimer > 0) {
      game.comboTimer--;
      if (game.comboTimer <= 0) game.combo = 0;
    }

    // Bullet-player collisions
    if (p.invincible <= 0) {
      const playerHitbox = { x: p.x + 8, y: p.y + 8, width: p.width - 16, height: p.height - 16 };
      const hitBullet = game.bullets.find(b => b.isEnemy && collides(b, playerHitbox));
      if (hitBullet) {
        game.bullets = game.bullets.filter(b => b !== hitBullet);
        playerHit(game);
      }

      // Enemy-player collision
      const hitEnemy = game.enemies.find(e => collides(e, playerHitbox));
      if (hitEnemy) {
        playerHit(game);
        hitEnemy.health -= 3;
        if (hitEnemy.health <= 0) {
          spawnExplosion(game.particles, hitEnemy.x + hitEnemy.width / 2, hitEnemy.y + hitEnemy.height / 2, 20, true);
        }
        game.enemies = game.enemies.filter(e => e.health > 0);
      }
    }

    // Power-up collection
    game.powerUps.forEach(pu => {
      pu.y += pu.vy;
    });
    game.powerUps = game.powerUps.filter(pu => {
      if (pu.y > CANVAS_HEIGHT + 30) return false;
      if (collides(pu, p)) {
        if (pu.type === 0) {
          p.firepower = Math.min(5, p.firepower + 1);
        } else if (pu.type === 1) {
          p.bombs = Math.min(5, p.bombs + 1);
        } else {
          p.lives = Math.min(5, p.lives + 1);
        }
        // Sparkle particles
        for (let i = 0; i < 10; i++) {
          game.particles.push({
            x: pu.x + pu.width / 2, y: pu.y + pu.height / 2,
            vx: rand(-2, 2), vy: rand(-2, 2),
            life: 20, maxLife: 20, color: '#ffdd44', size: 3
          });
        }
        return false;
      }
      return true;
    });

    // Update particles
    game.particles.forEach(pt => {
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.life--;
      pt.vx *= 0.98;
      pt.vy *= 0.98;
    });
    game.particles = game.particles.filter(pt => pt.life > 0);

    // Shake & flash timers
    if (game.shakeTimer > 0) game.shakeTimer--;
    if (game.flashTimer > 0) game.flashTimer--;

    // Update high score
    if (p.score > game.highScore) {
      game.highScore = p.score;
      localStorage.setItem('1942_highscore', String(p.score));
    }
  }, []);

  function playerHit(game: GameData) {
    const p = game.player;
    p.lives--;
    p.invincible = 120;
    p.firepower = Math.max(1, p.firepower - 1);
    game.shakeTimer = 15;
    game.flashTimer = 10;
    spawnExplosion(game.particles, p.x + p.width / 2, p.y + p.height / 2, 20, false);

    if (p.lives <= 0) {
      game.state = 'gameover';
      spawnExplosion(game.particles, p.x + p.width / 2, p.y + p.height / 2, 40, true);
    }
  }

  // ===== RENDER =====
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const game = gameRef.current;
    const frame = frameRef.current;

    ctx.save();

    // Screen shake
    if (game.shakeTimer > 0) {
      ctx.translate(rand(-3, 3), rand(-3, 3));
    }

    // Draw background
    drawBG(ctx, game);

    if (game.state === 'menu') {
      drawMenu(ctx, frame, game.highScore);
    } else {
      // Draw power-ups
      game.powerUps.forEach(pu => drawPowerUp(ctx, pu, frame));

      // Draw player
      if (game.state !== 'gameover') {
        drawPlayer(ctx, game.player, frame);
      }

      // Draw enemies
      game.enemies.forEach(e => drawEnemy(ctx, e, frame));

      // Draw bullets
      game.bullets.forEach(b => drawBullet(ctx, b, frame));

      // Draw particles
      drawParticles(ctx, game.particles);

      // Bomb flash
      if (game.bombActive > 0) {
        ctx.fillStyle = `rgba(255,255,255,${game.bombActive / 60 * 0.4})`;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      }

      // Hit flash
      if (game.flashTimer > 0) {
        ctx.fillStyle = `rgba(255,0,0,${game.flashTimer / 10 * 0.3})`;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      }

      // HUD
      drawHUD(ctx, game);

      if (game.state === 'paused') drawPaused(ctx);
      if (game.state === 'gameover') drawGameOver(ctx, game, frame);
    }

    ctx.restore();
  }, []);

  // ===== GAME LOOP =====
  const gameLoop = useCallback(() => {
    frameRef.current++;
    update();
    render();
    rafRef.current = requestAnimationFrame(gameLoop);
  }, [update, render]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [gameLoop]);

  // ===== INPUT HANDLERS =====
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key;
      keysRef.current.add(key);

      const game = gameRef.current;

      if (game.state === 'menu') {
        if (key === 'Enter' || key === ' ') {
          game.state = 'playing';
          e.preventDefault();
        }
      } else if (game.state === 'playing') {
        if (key === 'p' || key === 'P') {
          game.state = 'paused';
        }
        if ((key === 'b' || key === 'B') && game.player.bombs > 0) {
          game.player.bombs--;
          game.bombActive = 60;
          game.shakeTimer = 10;
        }
        if (key === ' ') e.preventDefault();
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
          e.preventDefault();
        }
      } else if (game.state === 'paused') {
        if (key === 'p' || key === 'P') {
          game.state = 'playing';
        }
      } else if (game.state === 'gameover') {
        if (key === 'Enter' || key === ' ') {
          const hs = game.highScore;
          Object.assign(game, initGame(hs));
          game.state = 'playing';
          e.preventDefault();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const game = gameRef.current;

    if (game.state === 'menu') {
      game.state = 'playing';
      return;
    }
    if (game.state === 'gameover') {
      const hs = game.highScore;
      Object.assign(game, initGame(hs));
      game.state = 'playing';
      return;
    }
    if (game.state === 'paused') {
      game.state = 'playing';
      return;
    }

    const touch = e.touches[0];
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    touchRef.current.active = true;
    touchRef.current.startX = (touch.clientX - rect.left) / scale;
    touchRef.current.startY = (touch.clientY - rect.top) / scale;
    touchRef.current.currentX = touchRef.current.startX;
    touchRef.current.currentY = touchRef.current.startY;
    touchRef.current.shooting = true;
  }, [scale]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    touchRef.current.currentX = (touch.clientX - rect.left) / scale;
    touchRef.current.currentY = (touch.clientY - rect.top) / scale;
  }, [scale]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    touchRef.current.active = false;
    touchRef.current.shooting = false;
  }, []);

  // Mouse/click handlers
  const handleClick = useCallback(() => {
    const game = gameRef.current;
    if (game.state === 'menu') {
      game.state = 'playing';
    } else if (game.state === 'gameover') {
      const hs = game.highScore;
      Object.assign(game, initGame(hs));
      game.state = 'playing';
    } else if (game.state === 'paused') {
      game.state = 'playing';
    }
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black select-none">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          width: CANVAS_WIDTH * scale,
          height: CANVAS_HEIGHT * scale,
          imageRendering: 'pixelated',
          cursor: 'crosshair',
          border: '2px solid #333',
          borderRadius: '4px',
          boxShadow: '0 0 30px rgba(0,100,255,0.3)',
          touchAction: 'none',
        }}
      />
      <div className="mt-2 flex gap-4 text-xs text-gray-500">
        <button
          className="px-3 py-1 bg-gray-800 text-gray-300 rounded hover:bg-gray-700 transition-colors"
          onClick={() => { autoShootRef.current = !autoShootRef.current; }}
        >
          自动射击: {autoShootRef.current ? 'ON' : 'OFF'}
        </button>
        <button
          className="px-3 py-1 bg-gray-800 text-gray-300 rounded hover:bg-gray-700 transition-colors"
          onClick={() => {
            const game = gameRef.current;
            if (game.state === 'playing' && game.player.bombs > 0) {
              game.player.bombs--;
              game.bombActive = 60;
              game.shakeTimer = 10;
            }
          }}
        >
          💣 炸弹
        </button>
      </div>
    </div>
  );
}
