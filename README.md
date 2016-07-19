[![Build Status](https://travis-ci.org/d180cf/tsumego.js.svg?branch=master)](https://travis-ci.org/d180cf/tsumego.js)

It's a simple tsumego solver in JS that I write in my spare time. At the moment this solver doesn't implement any advanced algorithms and is able to solve only basic problems in which the target is surrounded by a wall with no holes and the area being surrounded is up to 20 intersections. Some of these basic problems are rated as 7 dan on goproblems, though. The plan is to implement the [lambda](http://www.t-t.dk/publications/lambda_lncs.pdf) [df-pn](http://www.ijcai.org/papers07/Papers/IJCAI07-387.pdf) search, various [static analysis](https://webdocs.cs.ualberta.ca/~mmueller/ps/gpw97.pdf) algorithms and, perhaps, some [machine learning](http://arxiv.org/abs/1412.3409) techniques.

Here is an example of a [problem](http://www.goproblems.com/9210) that this solver can handle in a second. It can discover that there are a couple ways for black to capture the group, but if white is the ko master, then the marked intersection is the only way to go:

<img src="https://rawgit.com/d180cf/tsumego.js/master/docs/pics/9210.sgf.svg#234252343242" height="200pt" />

To get this solution first take a [release](https://github.com/d180cf/tsumego.js/releases) of the solver and then invoke `tsumego.solve`:

```ts
var sgf4 = '(;FF[4]'
    // up to 16x16 boards are supported
    + 'SZ[9]'
    // black stones
    + 'AB[ga][ab][bb][hb][cc][hc][cd][gd][hd][de][ee][fe]'
    // white stones
    + 'AW[ba][cb][fb][gb][dc][ec][gc][ed][fd]'
    // the target white stone
    + 'MA[ec]'
    // black plays first
    + 'PL[B])';

var move = tsumego.solve(sgf4); // "B[ea]"
```

The current implementation has a few limitations:

 - The max board size is 16x16. This is because internally coordinates are stored as pairs of 4 bit integers: this allows to pack enough data in 32 bit integers and speed up things quite a bit. Allocating 5 bits per coordinate, and thus extending the max board size up to 32x32, is not feasible because then some stuff won't fit into 32 bits and JS doesn't support 64 bit numbers.
 - The group in question must be surrounded by a thick wall: even diagonal connections aren't allowed. The solver determines the set of available moves (aka the R-zone) by filling the area inside that thick wall. The R-zone problem is probably the hardest problem in tsumego solving algorithms, especially for open boundary tsumegos. A theoretical solution exists - the T. Thompsen's lamda search - but that solution is hard to adopt in a JS solver due to performance reasons.

The solver uses internally es6 [generators](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function*) which allows to suspend and resume the search at any moment. This is very useful when debugging the solver, as the process of solving can be rendered in the UI step by step, but this can also be useful to let the user stop the search if it runs for too long. In the es5 build generators are transpiled into state machines with [Babel](https://github.com/babel/babel).

The solver explores about 10k positions per second, despite it uses es6 generators and other advanced features. Solvers written in Java/C++ are [said](http://www.is.titech.ac.jp/~kishi//pdf_file/kishi_phd_thesis.pdf) to explore around 40k/s positions.

As far as I know, there are very few tsumego solving software:

- Thomas Wolf's [GoTools](http://lie.math.brocku.ca/gotools/index.php?content=about) is good at fully enclosed tsumegos.
- Martin Muller's [Tsumego Explorer](http://webdocs.cs.ualberta.ca/~mmueller/ps/aaai05-tsumego.pdf) is probably the fastest solver for enclosed tsumegos.
- Erik van der Werf's [MIGOS](http://erikvanderwerf.tengen.nl/5x5/5x5solved.html) solves full boards up to 5x6.
- Thomas Thompsen's [MadLab](http://www.t-t.dk/madlab/) can solve open tsumegos.

None of these are in JS, but some can be embedded in a website in a Java applet. Also, in theory, a C++ solver could be ported to JS with [Emcripten](https://en.wikipedia.org/wiki/Emscripten).
