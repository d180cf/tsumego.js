/// <reference path="../tsumego.d.ts" />
/// <reference path="../libs/node.d.ts" />
/// <reference path="../libs/json-file.ts" />

declare module NodeJS {
    interface Global {
        tsumego: typeof tsumego;
    }
}

global.tsumego = require('../../tsumego.es6');

const w = JSON.parse(process.argv[3] || null) || tsumego.sequence(7, () => Math.random() - 0.5);
const eps = +process.argv[2] || 0.05;

console.log('eps = ' + eps);
console.log('w = [' + w.join(',') + ']');

const stone = tsumego.stone;

const boards: any = {}; // (;FF[4]SZ[9]...) -> W[ba]
const list: [string, { target: string, moves: any }][] = [];

Object.defineProperty(boards, 'size', { value: 0, writable: true });

console.log('loading solved positions...'); {
    for (const item of jsonfile.items('.bin/data.json')) {
        if (item.sgf && item.color * item.result > 0 && stone.hascoords(item.result)) {
            const move = stone.toString(item.result).slice(0, 5);
            const target = stone.toString(item.target).slice(0, 5);

            if (!boards[item.sgf]) {
                boards[item.sgf] = { target: target, moves: {} };
                list.push([item.sgf, boards[item.sgf]]);
                boards.size++;
            }

            boards[item.sgf].moves[move] = true;
        }
    }

    console.log(boards.size + ' positions loaded');
}

console.log('adjusting positions...'); {
    // this is something like the sigmoid function
    // to map values to [-1, +1] range, but it's
    // considerably faster; it's derivative is
    // dS / dx = (S / x)**2
    const S = (x: number) => x / (1 + tsumego.sign(x) * x);

    let timer = Date.now();

    while (true) {
        const index = Math.random() * list.length | 0;
        const [sgf, data] = list[index];

        const board = new tsumego.Board(sgf);
        const target = tsumego.stone.fromString(data.target);
        const expand = tsumego.mgen.fixed(board, target);
        const result = tsumego.stone.fromString(Object.keys(data.moves)[0]);
        const color = tsumego.sign(result);

        const ms: number[][] = []; // ms[s][i] = the i-th param for the s stone
        const vs: number[] = []; // vs[s] = ms[s] * w (the dot product)
        const ss: tsumego.stone[] = []; // same as Object.keys(vs), but faster

        // compute all the parameters for all available moves in this position
        for (const move of expand(color)) {
            const r = board.play(move);
            const tblock = board.get(target);
            const tnlibs = tsumego.block.libs(tblock);

            const q = [
                // maximize the number of captured stones first
                S(r),

                // minimize the number of own blocks in atari
                S(tsumego.mgen.ninatari(board, +color)),

                // minimize/maximize the number of libs of the target
                S(tnlibs * color * tsumego.sign(target)),

                // maximize the number of own liberties
                S(tsumego.mgen.sumlibs(board, +color)),

                // maximize the number of the opponent's blocks in atari
                S(tsumego.mgen.ninatari(board, -color)),

                // minimize the number of the opponent's liberties
                S(tsumego.mgen.sumlibs(board, -color)),

                // some randomness
                S(Math.random() - 0.5),
            ];

            board.undo();

            ss.push(move);
            ms[move] = q;
            vs[move] = 0;

            for (let i = 0; i < w.length; i++)
                vs[move] += w[i] * q[i];
        }

        if (ss.indexOf(result) >= 0 && ss.length > 3) {
            // adjust param weights to maximize the value of the best move
            for (let i = 0; i < w.length; i++) {
                let dw = 0;

                for (const s of ss)
                    dw += ((s == result ? 1 : 0) - vs[s]) * ms[s][i];

                w[i] += dw * eps;
            }

            if (Date.now() > timer + 1000) {
                timer = Date.now();
                console.log('w = [' + w.map(x => x.toFixed(4)).join(',') + ']');
            }
        }
    }
}
