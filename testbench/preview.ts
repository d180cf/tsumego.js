namespace testbench {
    import Board = tsumego.Board;

    export function renderPreview(board: Board) {
        const n = board.size;

        let svg = '';

        for (let x = 0; x < n; x++) {
            for (let y = 0; y < n; y++) {
                const c = board.get(x, y);
                if (!c) continue;

                svg += `<circle cx="${10 + x * 20}" cy="${10 + y * 20}" r="9" ${c < 0 ? 'fill="white"' : ''} stroke="black" />`;
            }
        }

        return `
            <svg width="${n * 20}" height="${n * 20}">
                <defs>
                    <pattern id="grid" x="10" y="10" width="20" height="20" patternUnits="userSpaceOnUse">
                        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="black" />
                    </pattern>
                </defs>

                <rect x="10" y="10" width="${n * 20 - 19}" height="${n * 20 - 19}" fill="url(#grid)" />
                ${svg}
            </svg>`;
    }
}