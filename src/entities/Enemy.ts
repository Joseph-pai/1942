export type EnemyType = 'BASIC_0' | 'BASIC_1' | 'BASIC_2' | 'BASIC_3' | 'BASIC_4' | 'ZIGZAG_5' | 'ZIGZAG_6' | 'ZIGZAG_7' | 'FAST_8' | 'FAST_9';
import { PlanePainter } from "../engine/PlanePainter";

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

    constructor(ctx: CanvasRenderingContext2D, x: number, y: number, speed: number, type: EnemyType) {
        this.ctx = ctx;
        this.x = x;
        this.y = y;
        this.speed = speed;
        this.type = type;
    }

    public update(dt: number) {
        this.timer += dt;

        if (this.type.startsWith('ZIGZAG')) {
            this.y += this.speed * dt;
            this.x += Math.sin(this.timer * 4) * 100 * dt;
        } else if (this.type.startsWith('FAST')) {
            this.y += this.speed * 1.5 * dt;
        } else {
            this.y += this.speed * dt;
        }

        if (this.y > this.ctx.canvas.height + this.height) {
            this.active = false;
        }
    }

    public render() {
        const typeIndex = parseInt(this.type.split('_')[1]);
        PlanePainter.drawEnemy(this.ctx, this.x, this.y, this.width, this.height, typeIndex);
    }
}
