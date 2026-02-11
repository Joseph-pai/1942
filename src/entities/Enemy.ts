export type EnemyType = 'BASIC_0' | 'BASIC_1' | 'BASIC_2' | 'BASIC_3' | 'BASIC_4' | 'ZIGZAG_5' | 'ZIGZAG_6' | 'ZIGZAG_7' | 'FAST_8' | 'FAST_9' | 'CIRCLE';
import { PlanePainter } from "../engine/PlanePainter";
import { Player } from "./Player";
import { Bullet } from "./Bullet";

export class Enemy {
    public x: number;
    public y: number;
    public width: number = 30;
    public height: number = 30;
    public health: number = 1;
    public speed: number;
    public active: boolean = true;
    public type: EnemyType;
    private ctx: CanvasRenderingContext2D;
    private timer: number = 0;

    // Shooting
    private shootTimer: number = 0;
    private canShoot: boolean;

    constructor(ctx: CanvasRenderingContext2D, x: number, y: number, speed: number, type: EnemyType) {
        this.ctx = ctx;
        this.x = x;
        this.y = y;
        this.speed = speed;
        this.type = type;

        // 30% chance to be a shooter, or higher for tough enemies
        this.canShoot = Math.random() < 0.3 || type.startsWith('FAST');
    }

    public update(dt: number, player?: Player, bullets?: Bullet[]) {
        this.timer += dt;

        // Custom movement patterns
        if (this.type === 'CIRCLE') {
            this.y += this.speed * 0.5 * dt;
            this.x += Math.cos(this.timer * 3) * 150 * dt; // Circular-ish
        } else if (this.type.startsWith('ZIGZAG')) {
            this.y += this.speed * dt;
            // Larger ZigZag
            this.x += Math.sin(this.timer * 3) * 120 * dt;
        } else if (this.type.startsWith('FAST')) {
            this.y += this.speed * 1.5 * dt;
        } else {
            // Basic Line / Straight
            this.y += this.speed * dt;
        }

        // Shooting Logic
        if (this.canShoot && player && bullets && this.y > 0 && this.y < this.ctx.canvas.height - 100) {
            this.shootTimer += dt;
            // Random fire rate
            if (this.shootTimer > 1.5 + Math.random() * 2) {
                this.shoot(player, bullets);
                this.shootTimer = 0;
            }
        }

        if (this.y > this.ctx.canvas.height + this.height) {
            this.active = false;
        }
    }

    private shoot(player: Player, bullets: Bullet[]) {
        // Aim at player
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const mag = Math.sqrt(dx * dx + dy * dy);

        // Normalize and scale speed
        const bulletSpeed = 200;
        const vx = (dx / mag) * bulletSpeed;
        const vy = (dy / mag) * bulletSpeed;

        // Enemy bullets are not player bullets (isPlayer = false)
        bullets.push(new Bullet(this.ctx, this.x, this.y + 20, 0, false, vx, vy));
    }

    public render() {
        let typeIndex = 0;
        if (this.type !== 'CIRCLE') {
            typeIndex = parseInt(this.type.split('_')[1] || '0');
        } else {
            typeIndex = 9; // Use a specific style for circle
        }

        PlanePainter.drawEnemy(this.ctx, this.x, this.y, this.width, this.height, typeIndex);
    }
}
