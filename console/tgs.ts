/// <reference path="../src/search.ts" />

declare const require;
declare const process;

const problem: string = process.argv[2];
const config: string = process.argv[3];

const fs = require('fs');
const sgfdata = fs.readFileSync(problem, 'utf8');

namespace tsumego {
    const colored = (b: Board) => (b + '')
        .replace(/(\n\s*)(\d+)/g, '$1\x1b[36;1m$2\x1b[0m')
        .replace(/^([^\n]+)/g, '\x1b[36;1m$1\x1b[0m')
        .replace(/X/g, '\x1b[31;1mX\x1b[0m')
        .replace(/O/g, '\x1b[33;1mO\x1b[0m');

    const sgf = SGF.parse(sgfdata);
    const setup = sgf.steps[0];
    const target = stone.fromString(setup['MA'][0]);
    const board = new Board(sgf);
    const tt = new TT;

    let paused = true;

    console.log('\n' + colored(board) + '\n');

    function prompt() {
        process.stdout.write('\n' + (0x100000000 + board.hash).toString(16).slice(-8) + ': ');
    }

    function xsolve<Move>(args: tsumego.Args) {
        return new Promise<stone>((resolve, reject) => {
            let callback: (r: stone) => void;

            paused = false;
            args = Object.create(args);

            const $ = args.debug;
            const g = solve.start(args);

            let maxd = 0;
            let t0 = Date.now();
            let t = t0, n = 0, ips = 5000;
            let s = g.next();

            (function next() {
                while (!s.done) {
                    s = g.next();
                    n++;

                    if ($.depth > maxd)
                        maxd = $.depth;

                    if (n > ips) {
                        const t1 = Date.now();
                        const dt = (t1 - t) / 1000;

                        if (dt > 1) {
                            process.title = [
                                ['time', ((t1 - t0) / 1000).toFixed(1) + 's'],
                                ['tt.size', args.tt.size],
                                ['nodes', n],
                                ['nodes/s', n / dt | 0],
                                ['maxdepth', maxd],
                            ].map(x => x.join(' = ')).join('; ');

                            ips = n / dt | 0;
                            t = t1;
                            n = 0;

                            if (!paused) {
                                setTimeout(next);
                            } else {
                                console.log('\npaused');
                                prompt();

                                const id = setInterval(() => {
                                    if (!paused)
                                        console.log('\nresumed'),
                                        prompt(),
                                        clearInterval(id),
                                        next();
                                });
                            }

                            return;
                        }
                    }
                }

                const r = s.value;

                resolve(r);
            })();
        });
    }

    async function find(config: string) {
        const [c2p, nkt] = /(\w)([+-].+)?/.exec(config).slice(1);

        const color = c2p == 'B' ? +1 : -1;
        const started = Date.now();
        const seed = Date.now() | 0;

        console.log('rand seed:', '0x' + seed.toString(16));
        console.log('solving... look at the window title');

        const move = await xsolve({
            board: board,
            color: color,
            tt: tt,
            debug: {},
            expand: mgen.fixed(board, target),
            target: target,
            alive: (b: Board) => benson.alive(b, target)
        });

        const dt = Date.now() - started;

        console.log('\nsolved in', dt / 1000 | 0, 's');

        if (move * color < 0) {
            console.log(color > 0 ? 'B' : 'W', 'cannot win');
        } else {
            console.log(
                move > 0 ? 'B' : 'W',
                'wins with',
                String.fromCharCode(0x41 + stone.x(move)) + (board.size - stone.y(move)));

            board.play(move);
            console.log('\n' + colored(board));
        }

        prompt();
    }

    if (config) {
        find(config);
    } else {
        console.log([
            'Interactive mode:',
            '',
            '    B A4   adds a block stone at A4',
            '    W G6   adds a white stone at G6',
            '    B      solve for black',
            '    W      solve for white',
            '    B+     solve for black + black has 1 ko treat',
            '    B-2    solve for black + white has 2 ko treats',
            '    W+     solve for white + black has 1 ko treat',
            '    W-2    solve for white + white has 1 ko treat',
            '    -      undo the last move',
            '    -3     undo the last 3 moves',
            '    pause  pause solving',
            '    resume resume solving',
            '    q      quit',
        ].join('\n'));

        const handlers: [RegExp, (...args: string[]) => void][] = [
            // plays the specified move
            [/^([BWXO]) ([A-Z])(\d+)$/i, (sc, sx, sy) => {
                const color = /B|X/.test(sc.toUpperCase()) ? +1 : -1;
                const x = sx.toUpperCase().charCodeAt(0) - 0x41;
                const y = board.size - +sy;
                const n = board.play(stone.make(x, y, color));

                if (!n)
                    console.log('invalid move');
                else
                    console.log('\n' + colored(board));
            }],

            // reverts a few moves
            [/^(?:-|undo)(\d+)?$/i, (sn = '1') => {
                let n = +sn;
                while (n-- > 0 && board.undo());
                console.log('\n' + colored(board));
            }],

            // finds the best move
            [/^([BWXO])(?:([+-])(\d+)?)?$/i, (sc, sk, sn = '1') => {
                sc = sc.toUpperCase();

                if (sc == 'X') sc = 'B';
                if (sc == 'O') sc = 'W';

                find(sc + sk + sn);
            }],

            [/^p|pause$/i, () => {
                if (!paused)
                    paused = true;
                else
                    console.log('not solving at the moment');
            }],

            [/^r|resume/i, () => {
                if (paused)
                    paused = false;
                else
                    console.log('already solving');
            }],

            [/^q|quit$/, () => {
                process.exit(0);
            }]
        ];

        prompt();

        process.stdin.on('data', data => {
            const line = (data + '').trim();

            let handled = false;

            for (const [regex, handler] of handlers) {
                const input = regex.exec(line);
                if (!input) continue;
                handler(...input.slice(1));
                handled = true;
            }

            if (!handled)
                console.log('invalid command');

            prompt();
        });
    }
}
