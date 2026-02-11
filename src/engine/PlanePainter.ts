export class PlanePainter {
    public static drawPlayer(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) {
        ctx.save();
        ctx.translate(x, y);

        // Main Body (Fuselage)
        ctx.fillStyle = '#4a69bd'; // Modern Blue
        this.drawRoundedRect(ctx, -width / 6, -height / 2, width / 3, height, 5);

        // Wings
        ctx.fillStyle = '#1e3799'; // Dark Blue
        ctx.beginPath();
        ctx.moveTo(-width / 1.2, -height / 10);
        ctx.lineTo(width / 1.2, -height / 10);
        ctx.lineTo(width / 1.5, height / 10);
        ctx.lineTo(-width / 1.5, height / 10);
        ctx.closePath();
        ctx.fill();

        // Tail Wings
        ctx.beginPath();
        ctx.moveTo(-width / 2.5, height / 2.5);
        ctx.lineTo(width / 2.5, height / 2.5);
        ctx.lineTo(width / 3, height / 2);
        ctx.lineTo(-width / 3, height / 2);
        ctx.closePath();
        ctx.fill();

        // Cockpit
        ctx.fillStyle = '#82ccdd';
        this.drawRoundedRect(ctx, -width / 10, -height / 4, width / 5, height / 4, 3);

        // Propellers (spinning effect)
        const time = Date.now() / 100;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-width / 1.5, -height / 8);
        ctx.lineTo(-width / 1.5 + Math.cos(time) * 15, -height / 8 + Math.sin(time) * 5);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(width / 1.5, -height / 8);
        ctx.lineTo(width / 1.5 + Math.cos(time) * 15, -height / 8 + Math.sin(time) * 5);
        ctx.stroke();

        ctx.restore();
    }

    public static drawEnemy(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, typeIndex: number) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.PI); // Enemies face down

        const colors = [
            '#eb4d4b', '#f0932b', '#6ab04c', '#7ed6df', '#e056fd',
            '#686de0', '#30336b', '#95afc0', '#2f3542', '#57606f'
        ];
        const color = colors[typeIndex % colors.length];
        const darkColor = this.shadeColor(color, -30);

        // Body variations based on typeIndex
        const bodyWidthFactor = 0.3 + (typeIndex % 3) * 0.1;

        ctx.fillStyle = color;
        this.drawRoundedRect(ctx, -width * bodyWidthFactor / 2, -height / 2, width * bodyWidthFactor, height, 5);

        // Wings variation
        ctx.fillStyle = darkColor;
        const wingSpan = 0.8 + (typeIndex % 4) * 0.1;
        ctx.beginPath();
        if (typeIndex % 2 === 0) {
            ctx.moveTo(-width * wingSpan, -height / 5);
            ctx.lineTo(width * wingSpan, -height / 5);
            ctx.lineTo(width * wingSpan * 0.8, height / 10);
            ctx.lineTo(-width * wingSpan * 0.8, height / 10);
        } else {
            // Swept wings
            ctx.moveTo(0, -height / 2);
            ctx.lineTo(-width * wingSpan, 0);
            ctx.lineTo(-width * wingSpan * 0.5, height / 4);
            ctx.lineTo(0, 0);
            ctx.lineTo(width * wingSpan * 0.5, height / 4);
            ctx.lineTo(width * wingSpan, 0);
        }
        ctx.closePath();
        ctx.fill();

        // Engine/Cockpit
        ctx.fillStyle = '#2d3436';
        ctx.beginPath();
        ctx.arc(0, -height / 3, width / 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    private static drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
        ctx.fill();
    }

    private static shadeColor(color: string, percent: number) {
        let R = parseInt(color.substring(1, 3), 16);
        let G = parseInt(color.substring(3, 5), 16);
        let B = parseInt(color.substring(5, 7), 16);

        R = Math.floor(R * (100 + percent) / 100);
        G = Math.floor(G * (100 + percent) / 100);
        B = Math.floor(B * (100 + percent) / 100);

        R = (R < 255) ? R : 255;
        G = (G < 255) ? G : 255;
        B = (B < 255) ? B : 255;

        const RR = ((R.toString(16).length === 1) ? "0" + R.toString(16) : R.toString(16));
        const GG = ((G.toString(16).length === 1) ? "0" + G.toString(16) : G.toString(16));
        const BB = ((B.toString(16).length === 1) ? "0" + B.toString(16) : B.toString(16));

        return "#" + RR + GG + BB;
    }
}
