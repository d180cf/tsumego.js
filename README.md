[![Build Status](https://travis-ci.org/d180cf/tsumego.js.svg?branch=master)](https://travis-ci.org/d180cf/tsumego.js)

It's a simple tsumego solver in JS that I write in my spare time. At the moment this solver doesn't implement any advanced algorithms and is able to solve only basic problems in which all possible moves (up to about 10) and the target to capture are set manually. The plan is to implement the [lambda](http://www.t-t.dk/publications/lambda_lncs.pdf) [df-pn](http://www.ijcai.org/papers07/Papers/IJCAI07-387.pdf) search, various [static analysis](https://webdocs.cs.ualberta.ca/~mmueller/ps/gpw97.pdf) algorithms and, perhaps, some [machine learning](http://arxiv.org/abs/1412.3409) techniques.

Here is an example of a [problem](http://www.goproblems.com/9210) that this solver can handle in half a minute. It can discover that if white is the ko master, black can still capture the group by playing at the marked intersection:

<img src="https://rawgit.com/d180cf/tsumego.js/master/docs/pics/9210.sgf.svg#234252343242" height="200pt" />

```ts
var sgf4 = '(;FF[4]'
    // up to 16x16 boards are supported
    + 'SZ[9]'
    // black stones
    + 'AB[ga][ab][bb][hb][cc][hc][cd][gd][hd][de][ee][fe]'
    // white stones
    + 'AW[ba][cb][fb][gb][dc][ec][gc][ed][fd]'
    // available moves (aka the relevancy zone or the R-zone)
    + 'SQ[aa][ba][ca][cb][da][db][dc][dd][ea][fa][eb][ga][ha][fb][gb][fc][gc][ia][ib][ic]'
    // the target white stone
    + 'MA[ec]'
    // white is the ko master
    + 'KM[W]'
    // black plays first
    + 'PL[B])';

var move = tsumego.solve(sgf4); // "B[ea]"
```

The current implementation has a few limitations:

 - The max board size is 16x16. This is because internally coordinates are stored as pairs of 4 bit integers: this allows to pack enough data in 32 bit integers and speed up things quite a bit. Allocating 5 bits per coordinate, and thus extending the max board size up to 32x32, is not feasible because then some stuff won't fit into 32 bits and JS doesn't support 64 bit numbers.
 - The R-zone must be specified manually and the solver won't attempt to play outside of it. This means, that the target group can be secured by not only making two eyes or setting up a seki, but also by reaching an edge of the R-zone: since capturing the group will require playing outside of the R-zone, the target group will be safe. To avoid that, make sure the attacker cannot reach an edge of the R-zone if the attacker plays properly. In general, the R-zone problem is probably the hardest problem in tsumego solving algorithms, especially for open boundary tsumegos. A theoretical solution exists - the T. Thompsen's lamda search - but that solution is hard to adopt in a JS solver due to performance reasons.

On the other hand, the solver uses internally es6 [generators](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function*) which allows to suspend and resume the solver at any moment. This is very useful when debugging the solver, as the process of solving can be rendered in the UI step by step, but this can also be useful to let the user stop the solver if it runs for too long. In the es5 build generators are transpiled into state machines. The `tsumego.solve.start` function returns an iterator:

```ts
function solve(args) {
    const g = solve.start(args);

    let s = g.next();

    while (!s.done)
        s = g.next();

    return s.value;
}
```

As far as I know, there are very few tsumego solving software:

- Thomas Wolf's [GoTools](http://lie.math.brocku.ca/gotools/index.php?content=about) is good at fully enclosed tsumegos.
- Martin Muller's [Tsumego Explorer](http://webdocs.cs.ualberta.ca/~mmueller/ps/aaai05-tsumego.pdf) is probably the fastest solver for enclosed tsumegos.
- Erik van der Werf's [MIGOS](http://erikvanderwerf.tengen.nl/5x5/5x5solved.html) solves full boards up to 5x6.
- Thomas Thompsen's [MadLab](http://www.t-t.dk/madlab/) can solve open tsumegos.

None of these are in JS, but some can be embedded in a website in a Java applet. Also, in theory, a C++ solver could be ported to JS with [Emcripten](https://en.wikipedia.org/wiki/Emscripten).
