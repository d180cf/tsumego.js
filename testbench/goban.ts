namespace testbench.gobanui {
    import stone = tsumego.stone;
    import Board = tsumego.Board;

    interface Marks {
        TR?: stone[]; // a little triangle
        SL?: stone[]; // a little square
    }

    interface GobanElement extends HTMLElement {
        getStoneCoords(event: MouseEvent): [number, number];
    }

    export function render(board: Board, marks = {}): GobanElement {
        const n = board.size;

        let shapes = [];

        for (let x = 0; x < n; x++) {
            for (let y = 0; y < n; y++) {
                const c = board.get(x, y);
                if (!c) continue;

                shapes.push(`<use x="${x}" y="${y}" xlink:href="#${c > 0 ? 'AB' : 'AW'}"/>`);
            }
        }

        const markers = {
            TR: (x, y) =>
                `<use x="${x}" y="${y}" xlink:href="#TR"/>`,

            SL: (x, y) =>
                `<use x="${x}" y="${y}" xlink:href="#SQ"/>`,

            MA: (x, y) =>
                `<use x="${x}" y="${y}" xlink:href="#MA"/>`,
        };

        for (const mark in markers) {
            for (const s of marks[mark] || []) {
                const [x, y] = stone.coords(s);
                const shape = markers[mark](x, y);
                shapes.push(shape);
            }
        }

        const wrapper = document.createElement('div');

        wrapper.innerHTML = `
            <svg version="1.0" xmlns="http://www.w3.org/2000/svg"
                 xmlns:xlink="http://www.w3.org/1999/xlink"
                 width="100%"
                 viewBox="-0.5 -0.5 ${n} ${n}">
              <style>
                * { stroke-width: 0.05 }
              </style>
              <defs>
                <pattern id="grid" x="0" y="0" width="1" height="1" patternUnits="userSpaceOnUse">
                  <path d="M 1 0 L 0 0 0 1" fill="none" stroke="black"></path>
                </pattern>

                <circle id="AW" r="0.475" fill="white" stroke="black"></circle>
                <circle id="AB" r="0.475" fill="black" stroke="black"></circle>
                <circle id="CR" r="0.25" fill="none" stroke="red"></circle>
                <path id="TR" d="M 0 -0.25 L -0.217 0.125 L 0.217 0.125 Z" fill="none" stroke="red"></path>
                <path id="MA" d="M -0.25 -0.25 L 0.25 0.25 M 0.25 -0.25 L -0.25 0.25" fill="none" stroke="red"></path>
                <path id="SQ" d="M -0.25 -0.25 L 0.25 -0.25 L 0.25 0.25 L -0.25 0.25 Z" fill="none" stroke="red"></path>
              </defs>

              <rect x="0" y="0" width="${n - 1}" height="${n - 1}" fill="url(#grid)" stroke="black" stroke-width="0.1"></rect>

              ${shapes.join('\r\n') }
            </svg>`;

        const goban = <HTMLElement>wrapper.querySelector('svg');

        return Object.assign(goban, {
            getStoneCoords(event: MouseEvent) {
                // Chrome had a bug which made offsetX/offsetY coords wrong
                // this workaround computes the offset using client coords
                const r = goban.getBoundingClientRect();

                const offsetX = event.clientX - r.left;
                const offsetY = event.clientY - r.top;

                const x = offsetX / goban.clientWidth;
                const y = offsetY / goban.clientHeight;

                return [
                    Math.round(x * n - 0.5),
                    Math.round(y * n - 0.5)
                ];
            }
        });
    }
}