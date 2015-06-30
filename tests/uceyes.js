var isEye = require('../uceyes').isEye;
var Board = require('../board');
var assert = require('assert');

var board = new Board(8, [
    '.X....O.',
    'XXXX..OO',
    '.X.X..O.',
    'XXXX..OO',
    '.XOOOO..',
    '.O.O.O..',
    'OOOOO.XX',
    '.O.O..X.'
]);

var eyes = {}, x, y, t;

for (x = 0; x < 8; x++) {
    for (y = 0; y < 8; y++) {
        t = '';

        if (isEye(board, x, y, +1))
            t += 'X';

        if (isEye(board, x, y, -1))
            t += 'O';

        if (t)
            eyes[x + ':' + y] = t;
    }
}

assert.deepEqual(eyes, {
    '0:0': 'X',
    '7:0': 'O',
    '0:2': 'X',
    '2:2': 'X',
    '7:2': 'O',
    '2:5': 'O',
    '0:7': 'O',
    '2:7': 'O',
    '4:5': 'O',
    '7:7': 'X'
});
