export class Bullet {
    public x: number;
    public y: number;
    public width: number = 4;
    public height: number = 10;
    public speed: number;
    public isPlayer: boolean;
    public active: boolean = true;
    public vx: number = 0;
    public vy: number = 0;
    private ctx: CanvasRenderingContext2D;

    constructor(ctx: CanvasRenderingContext2D, x: number, y: number, speed: number, isPlayer: boolean, vx: number = 0, vy: number = 0) {
        this.ctx = ctx;
        this.x = x;
        this.y = y;
        this.speed = speed;
        this.isPlayer = isPlayer;
        this.vx = vx;
        this.vy = vy;
    }

    public update(dt: number) {
        if (this.vx !== 0 || this.vy !== 0) {
            this.x += this.vx * dt;
            this.y += this.vy * dt;
        } else {
            this.y += this.speed * dt;
        }

        // Deactivate if off-screen
        if (this.y < -this.height || this.y > this.ctx.canvas.height + this.height || this.x < 0 || this.x > this.ctx.canvas.width) {
            this.active = false;
        }
    }

    public render() {
        this.ctx.fillStyle = this.isPlayer ? '#fff' : '#f0f';
        this.ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
    }
}
