export class Bullet {
    public x: number;
    public y: number;
    public width: number = 4;
    public height: number = 10;
    public speed: number;
    public isPlayer: boolean;
    public active: boolean = true;
    private ctx: CanvasRenderingContext2D;

    constructor(ctx: CanvasRenderingContext2D, x: number, y: number, speed: number, isPlayer: boolean) {
        this.ctx = ctx;
        this.x = x;
        this.y = y;
        this.speed = speed;
        this.isPlayer = isPlayer;
    }

    public update(dt: number) {
        this.y += this.speed * dt;

        // Deactivate if off-screen
        if (this.y < -this.height || this.y > this.ctx.canvas.height + this.height) {
            this.active = false;
        }
    }

    public render() {
        this.ctx.fillStyle = this.isPlayer ? '#fff' : '#f0f';
        this.ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
    }
}
