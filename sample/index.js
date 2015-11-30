window.onload = function () {
    var sgf4 = '(;FF[4]'
        + 'SZ[9]'
        + 'AB[ga][ab][bb][hb][cc][hc][cd][gd][hd][de][ee][fe]'
        + 'AW[ba][cb][fb][gb][dc][ec][gc][ed][fd]'
        + 'SQ[aa][ba][ca][cb][da][db][dc][dd][ea][fa][eb][ga][ha][fb][gb][fc][gc][ia][ib][ic]'
        + 'MA[ec]'
        + 'KM[W]'
        + 'PL[B])';

    document.body.innerHTML += 'Solving with tsumego.js@' + tsumego.version + '...';

    setTimeout(function () {
        var time = Date.now();
        var move = tsumego.solve(sgf4);

        document.body.innerHTML += move + '...';
        document.body.innerHTML += ((Date.now() - time) / 1000).toFixed(1) + 's..';
        document.body.innerHTML += move == 'B[ea]' ? 'Correct.' : 'Wrong.'
    });
};
