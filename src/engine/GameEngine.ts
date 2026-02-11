import { Player } from "../entities/Player";
import { InputHandler } from "./InputHandler";
import { Bullet } from "../entities/Bullet";
import { Enemy } from "../entities/Enemy";
import type { EnemyType } from "../entities/Enemy";
import { checkCollision } from "./CollisionSystem";
import { AudioManager } from "./AudioManager";
import { BackgroundPainter } from "./BackgroundPainter";

// Game Engine
export type GameState = 'MENU' | 'PLAYING' | 'GAMEOVER' | 'PAUSED' | 'LEVEL_COMPLETE';
const State: { [key: string]: GameState } = {
    MENU: 'MENU',
    PLAYING: 'PLAYING',
    GAMEOVER: 'GAMEOVER',
    PAUSED: 'PAUSED',
    LEVEL_COMPLETE: 'LEVEL_COMPLETE'
};

export class GameEngine {
    private ctx: CanvasRenderingContext2D;
    private state: GameState = State.MENU;
    private lastTime: number = 0;
    private difficulty: number = 1; // 1-10

    private lives: number = 3;
    private levelDuration: number = 90; // Seconds
    private levelTimer: number = 0;

    private player: Player;
    private input: InputHandler;
    private bullets: Bullet[] = [];
    private enemies: Enemy[] = [];
    private enemySpawnTimer: number = 0;
    private score: number = 0;
    private backgroundPainter: BackgroundPainter;

    constructor(ctx: CanvasRenderingContext2D) {
        this.ctx = ctx;
        this.player = new Player(ctx);
        this.input = new InputHandler();
        this.backgroundPainter = new BackgroundPainter(ctx);
    }

    public start() {
        this.lastTime = performance.now();
        this.animate(this.lastTime);
    }

    private animate(currentTime: number) {
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        this.update(deltaTime);
        this.render();

        requestAnimationFrame((time) => this.animate(time));
    }

    private update(dt: number) {
        if (this.state === State.MENU) {
            this.handleMenuInput();
            this.backgroundPainter.update(dt, 50); // Slow scroll in menu
        } else if (this.state === State.PLAYING) {
            this.levelTimer -= dt;
            this.backgroundPainter.update(dt, 100 + (this.difficulty * 10)); // Faster scroll

            if (this.levelTimer <= 0) {
                this.state = State.LEVEL_COMPLETE;
                AudioManager.playLevelComplete(); // Assuming we might add this later, or just reuse a sound
                setTimeout(() => {
                    this.nextLevel();
                }, 3000);
            }

            this.player.update(dt, this.input, this.bullets);

            // Update bullets
            for (let i = this.bullets.length - 1; i >= 0; i--) {
                this.bullets[i].update(dt);
                if (!this.bullets[i].active) {
                    this.bullets.splice(i, 1);
                }
            }

            // Spawn enemies
            this.handleEnemySpawning(dt);

            // Update enemies
            for (let i = this.enemies.length - 1; i >= 0; i--) {
                const enemy = this.enemies[i];
                enemy.update(dt, this.player, this.bullets); // Pass player for aiming

                // Collision with player
                if (checkCollision(this.player, enemy)) {
                    this.handlePlayerDeath();
                    enemy.active = false; // Destroy enemy too
                }

                // Enemy shoots logic is inside Enemy.update usually, but we need to handle their bullets if they create any?
                // Actually, let's pass the bullet list to enemy so they can add bullets

                // Collision with bullets
                for (let j = this.bullets.length - 1; j >= 0; j--) {
                    const bullet = this.bullets[j];
                    if (bullet.isPlayer && bullet.active && checkCollision(bullet, enemy)) {
                        bullet.active = false;
                        enemy.active = false;
                        this.score += 10 * this.difficulty;
                        AudioManager.playExplosion();
                        break;
                    } else if (!bullet.isPlayer && bullet.active && checkCollision(bullet, this.player)) {
                        bullet.active = false;
                        this.handlePlayerDeath();
                    }
                }

                if (!enemy.active) {
                    this.enemies.splice(i, 1);
                }
            }
        } else if (this.state === State.GAMEOVER) {
            if (this.input.keys.has('Enter') || this.input.keys.has('Space')) {
                this.resetGame();
            }
        }
    }

    private handleEnemySpawning(dt: number) {
        this.enemySpawnTimer += dt;
        const baseSpawnRate = Math.max(0.5, 2.0 - (this.difficulty * 0.15));

        if (this.enemySpawnTimer >= baseSpawnRate) {
            this.spawnEnemyFormation();
            this.enemySpawnTimer = 0;
        }
    }

    private handlePlayerDeath() {
        this.lives--;
        AudioManager.playExplosion();

        // Clear screen of enemies and bullets to give breathing room
        this.enemies = [];
        this.bullets = [];

        if (this.lives <= 0) {
            this.state = State.GAMEOVER;
        } else {
            // Respawn effectively just clears specific danger and maybe resets position
            this.player.reset();
            // Optional: momentary invulnerability state could go here
        }
    }

    private nextLevel() {
        this.difficulty++;
        this.levelTimer = this.levelDuration;
        this.state = State.PLAYING;
        // Keep lives as is
        this.player.reset();
        this.enemies = [];
        this.bullets = [];
    }

    private render() {
        const { width, height } = this.ctx.canvas;
        this.ctx.clearRect(0, 0, width, height);

        // Background
        this.backgroundPainter.render();

        if (this.state === State.MENU) {
            this.renderMenu();
        } else if (this.state === State.PLAYING) {
            this.bullets.forEach(b => b.render());
            this.enemies.forEach(e => e.render());
            this.player.render();
            this.renderHUD();
        } else if (this.state === State.LEVEL_COMPLETE) {
            this.renderLevelComplete();
        } else if (this.state === State.GAMEOVER) {
            this.renderGameOver();
        }
    }

    private renderHUD() {
        const { width } = this.ctx.canvas;
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 20px Arial';

        // Lives
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`LIVES: ${this.lives}`, 20, 30);

        // Timer
        this.ctx.textAlign = 'center';
        this.ctx.fillStyle = this.levelTimer < 10 ? '#f00' : '#fff';
        this.ctx.fillText(`TIME: ${Math.ceil(this.levelTimer)}`, width / 2, 30);

        // Score
        this.ctx.textAlign = 'right';
        this.ctx.fillStyle = '#fff';
        this.ctx.fillText(`SCORE: ${this.score}`, width - 20, 30);

        // Level
        this.ctx.textAlign = 'right';
        this.ctx.font = '14px Arial';
        this.ctx.fillText(`LEVEL: ${this.difficulty}`, width - 20, 50);
    }

    private renderLevelComplete() {
        const { width, height } = this.ctx.canvas;
        this.ctx.fillStyle = 'rgba(0,0,0,0.7)';
        this.ctx.fillRect(0, 0, width, height);
        this.ctx.fillStyle = '#0f0';
        this.ctx.textAlign = 'center';
        this.ctx.font = 'bold 40px Arial';
        this.ctx.fillText('LEVEL COMPLETE!', width / 2, height / 2);
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '20px Arial';
        this.ctx.fillText(`Next Level: ${this.difficulty + 1}`, width / 2, height / 2 + 50);
    }

    private renderGameOver() {
        const { width, height } = this.ctx.canvas;
        this.ctx.fillStyle = 'rgba(0,0,0,0.7)';
        this.ctx.fillRect(0, 0, width, height);
        this.ctx.fillStyle = '#f00';
        this.ctx.textAlign = 'center';
        this.ctx.font = 'bold 40px Arial';
        this.ctx.fillText('GAME OVER', width / 2, height / 2);
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '20px Arial';
        this.ctx.fillText(`Final Score: ${this.score}`, width / 2, height / 2 + 50);
        this.ctx.fillText(`Level Reached: ${this.difficulty}`, width / 2, height / 2 + 80);
        this.ctx.fillText('Press Space/Enter to Restart', width / 2, height / 2 + 130);
    }

    private spawnEnemyFormation() {
        const { width } = this.ctx.canvas;
        const formationType = Math.random();

        // Basic single spawn (fallback or mixed in)
        if (formationType < 0.4) {
            const x = Math.random() * (width - 40) + 20;
            const speed = 100 + (this.difficulty * 25);
            const type = this.getRandomEnemyType();
            this.enemies.push(new Enemy(this.ctx, x, -50, speed, type));
            return;
        }

        // Line Formation (3-5 enemies)
        if (formationType < 0.7) {
            const count = 3 + Math.floor(Math.random() * 2); // 3 to 4
            const startX = Math.random() * (width - (count * 40)) + 20;
            const speed = 120 + (this.difficulty * 20);
            const type = this.getRandomEnemyType();

            for (let i = 0; i < count; i++) {
                // Spaced out vertically or horizontally? 
                // Classic is usually a V or a line. Let's do horizontal line for simplicity first, or vertical "train".
                // Let's do a vertical train coming down.
                this.enemies.push(new Enemy(this.ctx, startX, -50 - (i * 60), speed, type));
            }
            return;
        }

        // Circle/Pattern Formation (handled by Enemy logic mostly, but we define the type)
        if (formationType >= 0.7) {
            const speed = 150 + (this.difficulty * 15);
            // Spawn a leader and maybe followers? For now, just a special enemy type that circles
            // Actually, let's just spawn a few "ZIGZAG" or circle types
            this.enemies.push(new Enemy(this.ctx, Math.random() * width, -50, speed, 'CIRCLE' as EnemyType));
        }
    }

    private getRandomEnemyType(): EnemyType {
        const totalTypes = 10;
        let maxTypeIndex = Math.min(totalTypes, 2 + this.difficulty);
        let typeIndex = Math.floor(Math.random() * maxTypeIndex);

        if (typeIndex >= 8) return `FAST_${typeIndex}` as EnemyType;
        if (typeIndex >= 5) return `ZIGZAG_${typeIndex}` as EnemyType;
        return `BASIC_${typeIndex}` as EnemyType;
    }

    private handleMenuInput() {
        if (this.input.keys.has('ArrowRight')) {
            this.setDifficulty(this.difficulty + 1);
            this.input.keys.delete('ArrowRight');
        }
        if (this.input.keys.has('ArrowLeft')) {
            this.setDifficulty(this.difficulty - 1);
            this.input.keys.delete('ArrowLeft');
        }

        if (this.input.keys.has('Space') || this.input.keys.has('Enter')) {
            this.state = State.PLAYING;
            this.levelTimer = this.levelDuration; // Reset timer on start
        }

        if (this.input.isTouching && this.input.touchPos) {
            const { width, height } = this.ctx.canvas;
            const rect = this.ctx.canvas.getBoundingClientRect();
            const tx = (this.input.touchPos.x - rect.left) * (width / rect.width);
            const ty = (this.input.touchPos.y - rect.top) * (height / rect.height);

            if (ty > height * 0.6) {
                this.state = State.PLAYING;
                this.levelTimer = this.levelDuration;
            } else if (ty > height * 0.4 && ty < height * 0.6) {
                if (tx < width * 0.3) this.setDifficulty(this.difficulty - 1);
                if (tx > width * 0.7) this.setDifficulty(this.difficulty + 1);
                this.input.isTouching = false;
            }
        }
    }

    private renderMenu() {
        const { width, height } = this.ctx.canvas;

        // Use background painter for menu too, but maybe darker?
        // Overlay gradient
        const grad = this.ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, 'rgba(0,0,20,0.8)');
        grad.addColorStop(1, 'rgba(0,0,50,0.8)');
        this.ctx.fillStyle = grad;
        this.ctx.fillRect(0, 0, width, height);

        this.ctx.fillStyle = '#fff';
        this.ctx.textAlign = 'center';

        this.ctx.font = 'bold 36px Arial';
        this.ctx.fillText('1942 RETRO', width / 2, height / 4);
        this.ctx.fillStyle = '#f00';
        this.ctx.fillText('STRIKE', width / 2, height / 4 + 45);

        this.ctx.fillStyle = '#fff';
        this.ctx.font = '22px Arial';
        this.ctx.fillText(`Difficulty Level`, width / 2, height / 2 - 40);

        this.ctx.strokeStyle = '#555';
        this.ctx.lineWidth = 4;
        this.ctx.strokeRect(width * 0.2, height / 2 - 10, width * 0.6, 20);

        const fillW = (this.difficulty / 10) * (width * 0.6);
        this.ctx.fillStyle = '#f00';
        this.ctx.fillRect(width * 0.2, height / 2 - 10, fillW, 20);

        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 28px Arial';
        this.ctx.fillText(this.difficulty.toString(), width / 2, height / 2 + 50);

        this.ctx.font = '16px Arial';
        this.ctx.fillText('< Tap / Arrows >', width / 2, height / 2 + 80);

        this.ctx.font = 'bold 24px Arial';
        this.ctx.fillStyle = '#ff0';
        this.ctx.fillText('START MISSION', width / 2, height * 0.75);
    }

    private resetGame() {
        this.score = 0;
        this.lives = 3;
        this.difficulty = 1; // Or keep expected difficulty? Usually reset to 1 or currently selected.
        // Let's reset to selected difficulty in menu or 1? Standard arcade resets to start.
        // But let's keep it simple: reset to 1.
        this.enemies = [];
        this.bullets = [];
        this.player = new Player(this.ctx);
        this.state = State.MENU; // Go back to menu usually, or restart playing immediately?
        // User asked: "User can select different difficulties at start". So reset to menu is better.
    }

    public setDifficulty(level: number) {
        this.difficulty = Math.max(1, Math.min(10, level));
    }
}
