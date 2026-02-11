export class InputHandler {
    public keys: Set<string> = new Set();
    public touchPos: { x: number, y: number } | null = null;
    public isTouching: boolean = false;

    constructor() {
        this.init();
    }

    private init() {
        // Keyboard
        window.addEventListener('keydown', (e) => this.keys.add(e.code));
        window.addEventListener('keyup', (e) => this.keys.delete(e.code));

        // Touch/Mouse
        window.addEventListener('mousedown', (e) => this.handleStart(e.clientX, e.clientY));
        window.addEventListener('mousemove', (e) => this.handleMove(e.clientX, e.clientY));
        window.addEventListener('mouseup', () => this.handleEnd());

        window.addEventListener('touchstart', (e) => {
            const touch = e.touches[0];
            this.handleStart(touch.clientX, touch.clientY);
        }, { passive: false });

        window.addEventListener('touchmove', (e) => {
            const touch = e.touches[0];
            this.handleMove(touch.clientX, touch.clientY);
            e.preventDefault();
        }, { passive: false });

        window.addEventListener('touchend', () => this.handleEnd());
    }

    private handleStart(x: number, y: number) {
        this.isTouching = true;
        this.touchPos = { x, y };
    }

    private handleMove(x: number, y: number) {
        if (this.isTouching) {
            this.touchPos = { x, y };
        }
    }

    private handleEnd() {
        this.isTouching = false;
        this.touchPos = null;
    }
}
