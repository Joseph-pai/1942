export interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  lives: number;
  bombs: number;
  firepower: number;
  invincible: number;
  score: number;
  shootCooldown: number;
}

export interface Enemy {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  health: number;
  maxHealth: number;
  type: number;
  shootTimer: number;
  shootInterval: number;
  movePattern: number;
  moveTimer: number;
  startX: number;
  scoreValue: number;
}

export interface Bullet {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  isEnemy: boolean;
  damage: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface PowerUp {
  x: number;
  y: number;
  width: number;
  height: number;
  type: number;
  vy: number;
}

export interface BGElement {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  opacity: number;
  type: number;
}

export type GameState = 'menu' | 'playing' | 'gameover' | 'paused';

export interface GameData {
  state: GameState;
  player: Player;
  enemies: Enemy[];
  bullets: Bullet[];
  particles: Particle[];
  powerUps: PowerUp[];
  bgElements: BGElement[];
  wave: number;
  waveTimer: number;
  waveDelay: number;
  bgOffset: number;
  highScore: number;
  shakeTimer: number;
  flashTimer: number;
  bombActive: number;
  combo: number;
  comboTimer: number;
}

export const CANVAS_WIDTH = 420;
export const CANVAS_HEIGHT = 680;
