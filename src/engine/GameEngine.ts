import { Player } from "../entities/Player";
import { InputHandler } from "./InputHandler";
import { Bullet } from "../entities/Bullet";
import { Enemy, EType } from "../entities/Enemy";
import { checkCollision } from "./CollisionSystem";

// Game Engine
export type GameState = 'MENU' | 'PLAYING' | 'GAMEOVER' | 'PAUSED';
const State: { [key: string]: GameState } = {
    MENU: 'MENU',
    PLAYING: 'PLAYING',
    GAMEOVER: 'GAMEOVER',
    PAUSED: 'PAUSED'
};

export class GameEngine {
    private ctx: CanvasRenderingContext2D;
    private state: GameState = State.MENU;
    private lastTime: number = 0;
    private difficulty: number = 1; // 1-10

    private player: Player;
    private input: InputHandler;
    private bullets: Bullet[] = [];
    private enemies: Enemy[] = [];
    private enemySpawnTimer: number = 0;
    private score: number = 0;

    constructor(ctx: CanvasRenderingContext2D) {
        this.ctx = ctx;
        this.player = new Player(ctx);
        this.input = new InputHandler();
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
        } else if (this.state === State.PLAYING) {
            this.player.update(dt, this.input, this.bullets);

            // Update bullets
            for (let i = this.bullets.length - 1; i >= 0; i--) {
                this.bullets[i].update(dt);
                if (!this.bullets[i].active) {
                    this.bullets.splice(i, 1);
                }
            }

            // Spawn enemies based on difficulty
            this.enemySpawnTimer += dt;
            const spawnRate = Math.max(0.2, 1.5 - (this.difficulty * 0.12));
            if (this.enemySpawnTimer >= spawnRate) {
                this.spawnEnemy();
                this.enemySpawnTimer = 0;
            }

            // Update enemies
            for (let i = this.enemies.length - 1; i >= 0; i--) {
                const enemy = this.enemies[i];
                enemy.update(dt);

                // Collision with player
                if (checkCollision(this.player, enemy)) {
                    this.state = State.GAMEOVER;
                }

                // Collision with bullets
                for (let j = this.bullets.length - 1; j >= 0; j--) {
                    const bullet = this.bullets[j];
                    if (bullet.isPlayer && bullet.active && checkCollision(bullet, enemy)) {
                        bullet.active = false;
                        enemy.active = false;
                        this.score += 10 * this.difficulty;
                        break;
                    }
                }

                if (!enemy.active) {
                    this.enemies.splice(i, 1);
                }
            }
        } else if (this.state === State.GAMEOVER) {
            if (this.input.keys.has('Enter') || this.input.keys.has('Space')) {
                this.reset();
            }
        }
    }

    private render() {
        const { width, height } = this.ctx.canvas;
        this.ctx.clearRect(0, 0, width, height);

        // Background
        this.ctx.fillStyle = '#111';
        this.ctx.fillRect(0, 0, width, height);

        if (this.state === State.MENU) {
            this.renderMenu();
        } else if (this.state === State.PLAYING) {
            this.bullets.forEach(b => b.render());
            this.enemies.forEach(e => e.render());
            this.player.render();
            this.renderHUD();
        } else if (this.state === State.GAMEOVER) {
            this.renderGameOver();
        }
    }


    private renderHUD() {
        const { width } = this.ctx.canvas;
        this.ctx.fillStyle = '#fff';
        this.ctx.textAlign = 'left';
        this.ctx.font = '16px Arial';
        this.ctx.fillText(`LVL: ${this.difficulty}`, 10, 25);
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`SCORE: ${this.score}`, width - 10, 25);
    }

    private renderGameOver() {
        const { width, height } = this.ctx.canvas;
        this.ctx.fillStyle = 'rgba(0,0,0,0.7)';
        this.ctx.fillRect(0, 0, width, height);
        this.ctx.fillStyle = '#fff';
        this.ctx.textAlign = 'center';
        this.ctx.font = 'bold 40px Arial';
        this.ctx.fillText('GAME OVER', width / 2, height / 2);
        this.ctx.font = '20px Arial';
        this.ctx.fillText(`Final Score: ${this.score}`, width / 2, height / 2 + 50);
        this.ctx.fillText('Press Space/Enter to Restart', width / 2, height / 2 + 100);
    }

    private spawnEnemy() {
        const { width } = this.ctx.canvas;
        const x = Math.random() * (width - 40) + 20;

        // Dynamic speed based on difficulty (100 to 300)
        const speed = 100 + (this.difficulty * 25);

        let type = EType.BASIC;
        const rand = Math.random();

        // More complex enemies appear at higher difficulties
        if (this.difficulty >= 3 && rand > 0.7) type = EType.ZIGZAG;
        if (this.difficulty >= 7 && rand > 0.85) type = EType.FAST;

        this.enemies.push(new Enemy(this.ctx, x, -50, speed, type));
    }

    private handleMenuInput() {
        // Tap to start in center, or use arrows to change difficulty
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
        }

        // Mobile touch start
        if (this.input.isTouching && this.input.touchPos) {
            const { width, height } = this.ctx.canvas;
            const rect = this.ctx.canvas.getBoundingClientRect();
            const tx = (this.input.touchPos.x - rect.left) * (width / rect.width);
            const ty = (this.input.touchPos.y - rect.top) * (height / rect.height);

            // Start area (bottom part of screen)
            if (ty > height * 0.6) {
                this.state = State.PLAYING;
            } else if (ty > height * 0.4 && ty < height * 0.6) {
                // Difficulty selection area
                if (tx < width * 0.3) this.setDifficulty(this.difficulty - 1);
                if (tx > width * 0.7) this.setDifficulty(this.difficulty + 1);
                // Simple debouncing for touch
                this.input.isTouching = false;
            }
        }
    }

    private renderMenu() {
        const { width, height } = this.ctx.canvas;

        // Overlay gradient
        const grad = this.ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, '#001');
        grad.addColorStop(1, '#003');
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

        // Difficulty Slider visual
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
        this.ctx.fillText('< Tap to Change >', width / 2, height / 2 + 80);

        this.ctx.font = 'bold 24px Arial';
        this.ctx.fillStyle = '#ff0';
        this.ctx.fillText('TAP TO START', width / 2, height * 0.75);
    }

    private reset() {
        this.score = 0;
        this.enemies = [];
        this.bullets = [];
        this.player = new Player(this.ctx);
        this.state = State.PLAYING;
    }

    public setDifficulty(level: number) {
        this.difficulty = Math.max(1, Math.min(10, level));
    }
}
