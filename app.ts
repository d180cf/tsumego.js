'use strict';

import * as assert from 'assert';
import * as fs from 'fs';
import {parse, _w, _y, _r, _c, xy2s, c2s} from './src/utils';
import Board from './src/board';
import {solve} from './src/solver';

function place(stones: string[], color: Color): void {
    stones.map(function (s) {
        var xy = parse(s);
        var r = board.play(xy[0], xy[1], color);
        //console.log(board + '');
    });
}

function parseShapeData(data: string): [Board, XYIndex[], XYIndex] {
    data = data.trim().split('\n').map(s => s.trim()).filter(s => !!s).join('\n') + '\n';

    const strBoard = /([.XO]+\n)+/img.exec(data)[0].trim();
    const strRZone = /([a-z]\d+\s*?){2,}\n/img.exec(data)[0].trim();
    const strAim = /^[a-z]\d+\n/img.exec(data)[0].trim();

    const board = new Board(8, strBoard.split('\n'));
    const rzone = strRZone.split(/\s+/).map(parse);
    const aim = parse(strAim);

    return [board, rzone, aim];
}

const data = fs.readFileSync(process.argv[2] || 'problems/18629.txt', 'utf8');
var [board, rzone, aim] = parseShapeData(data);

function bts(board: Board): string {
    return board.toString({
        black: _y,
        white: _r,
        compact: true
    });
}

function printb(board: Board, solution: string[]) {
    var b = board.fork();
    solution.map(function (xyc) {
        var pc = xyc.slice(-1);
        var xy = parse(xyc);
        b.play(xy[0], xy[1], pc == 'X' ? +1 : -1);
        console.log(bts(b), '\n');
    });
}

function s2s(c: Color, s: Result) {
    let isDraw = s.color == 0;
    let isLoss = s.color * c < 0;

    return _w(c2s(c)) + ' ' + _c(isLoss ? 'loses' : (isDraw ? 'draws' : 'wins') + ' with ' + xy2s(s.move));
}

//
// shared transposition table for black and white
//

var tt: Cache = {};

function solve2(path: Board[], color: Color, nkotreats: number = 0, observer?) {
    let t0 = +new Date;
    let rs = solve(path, color, nkotreats, rzone, aim, tt, observer);
    let t1 = +new Date;
    console.log('solved in', ((t1 - t0) / 1000).toFixed(2), 'seconds');
    console.log(s2s(color, rs));
    console.log('tt:', Object.keys(tt).length);
    return rs;
}

function solveWithLogging(path: Board[], color: Color, nkotreats = 0) {
    let indent: string[] = [];
    let tree = [], leaf = tree, stack = [];

    function log(...args: any[]) {
        let prefix = indent.join('');
        let output = [...args].join(' ').split('\n').map(s => prefix + s).join('\n');
        console.log(output);
    }

    log('solving for', _w(c2s(color)), 'with', nkotreats, 'ko treats...');

    let nodes = 0;

    let rs = solve2(path, color, nkotreats, {
        move: () => {
            nodes++;
        },
        solving: (board, color) => {
            let next = [board, color, null, null, null];
            leaf.push(next);
            stack.push(leaf);
            leaf = next;
        },
        solved: (board, color, br) => {
            if (leaf[0] !== board)
                debugger;

            leaf[2] = br.color;
            leaf[3] = br.move && br.move.x;
            leaf[4] = br.move && br.move.y;
            leaf = stack.pop();
        }
    });

    console.log('nodes:', nodes);    

    let json = JSON.stringify(tree[0], (k, v) => v instanceof Board ? v.hash() : v, 4);

    fs.writeFileSync('./viewer/tree.js', 'tree = ' + json, 'utf8');
    
    return rs;
}

let path: Board[] = [board.fork()];
console.log('\n\n' + board.hash() + '\n\n' + bts(board));

process.stdout.write('\ntsumego :> ');

process.stdin.on('data', data => {
    setTimeout(() => {
        const cmd = data.toString().trim().split(' ');
        const col = cmd[0].toLowerCase();

        switch (col) {
            case 'x':
            case 'o':
                var xy = cmd[1] && cmd[1].toUpperCase();
                var b = path[path.length - 1].fork();
                var c = cmd[0].toUpperCase() == 'O' ? -1 : +1;

                if (/^[a-z]\d+$/i.test(xy)) {
                    var p = parse(xy);

                    if (!b.play(p.x, p.y, c)) {
                        console.log(col, 'cannot play at', xy);
                    } else {
                        path.push(b);
                        console.log('\n\n' + b.hash() + '\n\n' + bts(b));
                    }
                } else {
                    const {move} = solveWithLogging(path, c, !xy ? 0 : +xy);

                    if (!move) {
                        console.log(col, 'passes');
                    } else {
                        b.play(move.x, move.y, c);
                        path.push(b);
                        console.log('\n\n' + b.hash() + '\n\n' + bts(b));
                    }
                }
                break;
            case 'undo':
                if (path.length > 1) {
                    for (let n = +(cmd[1] || 1); n > 0 && path.length > 1; n--) {
                        path.pop();
                        board = path[path.length - 1];
                    }
                    console.log('\n\n' + board.hash() + '\n\n' + bts(board));
                } else {
                    console.log('nothing to undo');
                }
                break;
            case 'path':
                for (let b of path)
                    console.log('\n\n' + b.hash() + '\n\n' + bts(b));
                break;
            default:
                console.log('unknown command');
        }

        process.stdout.write(_c('\ntsumego :> '));
    }, 0);
});
