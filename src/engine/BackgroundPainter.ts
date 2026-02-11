export class BackgroundPainter {
    private ctx: CanvasRenderingContext2D;
    private offset: number = 0;
    private islands: { x: number, y: number, w: number, h: number, type: number }[] = [];
    private width: number;
    private height: number;

    constructor(ctx: CanvasRenderingContext2D) {
        this.ctx = ctx;
        this.width = ctx.canvas.width;
        this.height = ctx.canvas.height;
        this.generateIslands();
    }

    private generateIslands() {
        // Generate some random islands for the background loop
        for (let i = 0; i < 10; i++) {
            this.islands.push({
                x: Math.random() * this.width,
                y: Math.random() * (this.height * 2) - this.height, // Spread over 2 screens height
                w: 50 + Math.random() * 150,
                h: 50 + Math.random() * 150,
                type: Math.floor(Math.random() * 3)
            });
        }
    }

    public update(dt: number, speed: number) {
        this.offset += speed * dt;
        if (this.offset > this.height) {
            this.offset -= this.height;
            // Regenerate islands specifically when looping? Or just wrap them?
            // Simple wrapping for now
        }
    }

    public render() {
        // Sea
        this.ctx.fillStyle = '#004080'; // Dark Blue Sea
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Grid lines to give speed sensation (classic retro feel)
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 2;

        const outputOffset = Math.floor(this.offset);

        // Vertical lines
        for (let x = 0; x < this.width; x += 100) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.height);
            this.ctx.stroke();
        }

        // Horizontal lines (moving)
        for (let y = outputOffset % 100; y < this.height; y += 100) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.width, y);
            this.ctx.stroke();
        }

        // Islands (Green blobs)
        this.ctx.fillStyle = '#228B22'; // Forest Green
        for (const island of this.islands) {
            // Calculate effective Y position with wrapping
            let effY = island.y + this.offset;
            if (effY > this.height) effY -= (this.height * 2);
            // We generated them over 2 heights, so we wrap somewhat loosely. 
            // Better: just modulo mapped

            const renderY = (island.y + this.offset) % (this.height * 2) - 200; // -200 to allow offscreen top

            // Simple Island shapes
            this.ctx.beginPath();
            this.ctx.ellipse(island.x, renderY, island.w / 2, island.h / 2, 0, 0, Math.PI * 2);
            this.ctx.fill();

            // Add a "beach" outline
            this.ctx.strokeStyle = '#DAA520'; // Goldenrod
            this.ctx.lineWidth = 5;
            this.ctx.stroke();
        }

        // Maybe a ships/carrier silhouette?
        // Let's draw a simple carrier at the very bottom start or randomly
        // For now, keep it simple with Sea + Islands as requested "Sea, Ground (Islands)".
    }
}
