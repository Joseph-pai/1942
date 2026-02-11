export class CanvasManager {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private targetRatio: number = 3 / 4;

    constructor(canvasId: string) {
        let existing = document.getElementById(canvasId) as HTMLCanvasElement;
        if (!existing) {
            existing = document.createElement('canvas');
            existing.id = canvasId;
            document.body.appendChild(existing);
        }
        this.canvas = existing;
        this.ctx = this.canvas.getContext('2d')!;
        this.init();
    }

    private init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());
        window.addEventListener('orientationchange', () => {
            // Delay slightly for mobile orientation change to complete
            setTimeout(() => this.resize(), 300);
        });
    }

    private resize() {
        let width = window.innerWidth;
        let height = window.innerHeight;

        if (width / height > this.targetRatio) {
            width = height * this.targetRatio;
        } else {
            height = width / this.targetRatio;
        }

        this.canvas.width = width;
        this.canvas.height = height;
        this.canvas.style.width = `${width}px`;
        this.canvas.style.height = `${height}px`;

        // Dispatch custom event for game systems to update their scaling
        window.dispatchEvent(new CustomEvent('game-resized', {
            detail: { width, height }
        }));
    }

    public getContext() { return this.ctx; }
    public getWidth() { return this.canvas.width; }
    public getHeight() { return this.canvas.height; }
}
