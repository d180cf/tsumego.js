function log(text) {
    document.body.innerHTML += '<pre>' + text + '</pre>';
    console.log(text);
}

window.onload = function () {
    var sgf = '(;FF[4]SZ[9]'
        + 'AB[ba][ia][ab][eb][ib][ac][bc][cc][gc][hc][ic][dd][ed][fd]'
        + 'AW[ea][bb][cb][db][gb][hb][dc][ec][fc]'
        + 'SQ[aa][ba][ca][da][ea][fa][ga][ha][fb][eb][gb][hb]'
        + 'MA[db]'
        + 'PL[B])';

    log('solving with tsumego.js v' + tsumego.version);
    log(new tsumego.Board(sgf) + '');

    // let the browser render the first message and then invoke the solver
    setTimeout(function () {
        var time = Date.now();
        var move = tsumego.solve(sgf);

        if (move == 'B[fb]') {
            log(move + ' is a correct solution');
            log('solved in ' + ((Date.now() - time) / 1000).toFixed(1) + 's.');
        } else {
            log(move + ' is a wrong solution');
        }
    });
};
