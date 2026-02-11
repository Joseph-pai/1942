import { Bullet } from "./Bullet";

export class Player {
    public x: number;
    public y: number;
    public width: number = 40;
    public height: number = 40;
    public speed: number = 300;
    private ctx: CanvasRenderingContext2D;

    private shootTimer: number = 0;
    private shootCooldown: number = 0.2; // Seconds between shots

    constructor(ctx: CanvasRenderingContext2D) {
        this.ctx = ctx;
        this.x = ctx.canvas.width / 2;
        this.y = ctx.canvas.height - 100;
    }

    public update(dt: number, input: any, bullets: Bullet[]) {
        // Keyboard movement
        if (input.keys.has('ArrowLeft') || input.keys.has('KeyA')) this.x -= this.speed * dt;
        if (input.keys.has('ArrowRight') || input.keys.has('KeyD')) this.x += this.speed * dt;
        if (input.keys.has('ArrowUp') || input.keys.has('KeyW')) this.y -= this.speed * dt;
        if (input.keys.has('ArrowDown') || input.keys.has('KeyS')) this.y += this.speed * dt;

        // Touch/Mouse relative movement (follow finger)
        if (input.isTouching && input.touchPos) {
            const rect = this.ctx.canvas.getBoundingClientRect();
            const targetX = (input.touchPos.x - rect.left) * (this.ctx.canvas.width / rect.width);
            const targetY = (input.touchPos.y - rect.top) * (this.ctx.canvas.height / rect.height);

            this.x += (targetX - this.x) * 0.2;
            this.y += (targetY - (this.y + this.height / 2)) * 0.2;
        }

        // Shooting logic (auto shooting for mobile feel, or manual for keyboard)
        this.shootTimer += dt;
        if (this.shootTimer >= this.shootCooldown) {
            this.shoot(bullets);
            this.shootTimer = 0;
        }

        // Constraints
        this.x = Math.max(this.width / 2, Math.min(this.ctx.canvas.width - this.width / 2, this.x));
        this.y = Math.max(this.height / 2, Math.min(this.ctx.canvas.height - this.height / 2, this.y));
    }

    private shoot(bullets: Bullet[]) {
        // Dual bullets for 1942 feel
        bullets.push(new Bullet(this.ctx, this.x - 10, this.y - 20, -500, true));
        bullets.push(new Bullet(this.ctx, this.x + 10, this.y - 20, -500, true));
    }

    public render() {
        this.ctx.save();
        this.ctx.fillStyle = '#f00';
        this.ctx.translate(this.x, this.y);

        // Body
        this.ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);

        // Wings
        this.ctx.fillStyle = '#800';
        this.ctx.fillRect(-this.width / 1, -this.height / 8, this.width * 2, this.height / 4);

        // Nose
        this.ctx.fillStyle = '#fff';
        this.ctx.fillRect(-this.width / 4, -this.height / 1.5, this.width / 2, this.height / 4);

        this.ctx.restore();
    }
}
