// Enemy Entity
export type EnemyType = 'BASIC' | 'ZIGZAG' | 'FAST';
export const EType: { [key: string]: EnemyType } = {
    BASIC: 'BASIC',
    ZIGZAG: 'ZIGZAG',
    FAST: 'FAST'
};

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

        switch (this.type) {
            case EType.BASIC:
                this.y += this.speed * dt;
                break;
            case EType.ZIGZAG:
                this.y += this.speed * dt;
                this.x += Math.sin(this.timer * 4) * 100 * dt;
                break;
            case EType.FAST:
                this.y += this.speed * 1.5 * dt;
                break;
        }

        if (this.y > this.ctx.canvas.height + this.height) {
            this.active = false;
        }
    }

    public render() {
        this.ctx.fillStyle = '#0f0';
        if (this.type === EType.ZIGZAG) this.ctx.fillStyle = '#ff0';
        if (this.type === EType.FAST) this.ctx.fillStyle = '#0ff';

        this.ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
    }
}
