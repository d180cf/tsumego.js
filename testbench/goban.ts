namespace testbench.gobanui {
    import stone = tsumego.stone;
    import Board = tsumego.Board;

    interface Marks {
        TR?: stone[]; // a little triangle
        SL?: stone[]; // a little square
    }

    interface GobanElement extends HTMLElement {
        getStoneCoords(offsetX: number, offsetY: number): [number, number];
    }

    export function render(board: Board, marks = {}): GobanElement {
        const n = board.size;

        let shapes = [];

        for (let x = 0; x < n; x++) {
            for (let y = 0; y < n; y++) {
                const c = board.get(x, y);
                if (!c) continue;

                shapes.push(`<circle cx="${10 + x * 20}" cy="${10 + y * 20}" r="9" ${c < 0 ? 'fill="white"' : ''} stroke="black" />`);
            }
        }

        const markers = {
            TR: (x, y) =>
                `<polygon points="${[x, y + 3]} ${[x - 3, y - 3]} ${[x + 3, y - 3]}" fill="red" />`,

            SL: (x, y) =>
                `<polygon points="${[x - 3, y - 3]} ${[x + 3, y - 3]} ${[x + 3, y + 3]} ${[x - 3, y + 3]}" fill="red" />`,

            MA: (x, y) =>
                `<line x1="${x - 3}" y1="${y - 3}" x2="${x + 3}" y2="${y + 3}" stroke="red" />` +
                `<line x1="${x - 3}" y1="${y + 3}" x2="${x + 3}" y2="${y - 3}" stroke="red" />`,
        };

        for (const mark in markers) {
            for (const s of marks[mark] || []) {
                const [x, y] = stone.coords(s);
                const shape = markers[mark](10 + x * 20, 10 + y * 20);
                shapes.push(shape);
            }
        }

        const wrapper = document.createElement('div');

        wrapper.innerHTML = `
            <svg width="100%" viewBox="0 0 ${n * 20} ${n * 20}">
                <defs>
                    <pattern id="grid" x="10" y="10" width="20" height="20" patternUnits="userSpaceOnUse">
                        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="black" />
                    </pattern>
                </defs>

                <rect x="10" y="10" width="${n * 20 - 19}" height="${n * 20 - 19}" fill="url(#grid)" />
                ${shapes.join('\r\n') }
            </svg>`;

        return Object.assign(wrapper.querySelector('svg'), {
            getStoneCoords(offsetX: number, offsetY: number) {
                return [
                    Math.round((offsetX - 10) / 35),
                    Math.round((offsetY - 10) / 35)
                ];
            }
        });
    }
}