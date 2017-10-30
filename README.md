[![Build Status](https://travis-ci.org/d180cf/tsumego.js.svg?branch=master)](https://travis-ci.org/d180cf/tsumego.js)
[![npm version](https://badge.fury.io/js/tsumego.js.svg)](https://www.npmjs.com/package/tsumego.js)
[![Downloads](https://img.shields.io/npm/dm/tsumego.js.svg)](https://www.npmjs.com/package/tsumego.js)

It's a simple tsumego solver in JS that I write in my spare time. At the moment this solver doesn't implement any advanced algorithms and is able to solve only basic problems in which the target is surrounded by a thick wall and the surrounded area is up to 15 intersections. Some of these basic problems are rated as 9 dan on goproblems, though. The plan is to implement the [lambda](http://www.t-t.dk/publications/lambda_lncs.pdf) [df-pn](http://www.ijcai.org/papers07/Papers/IJCAI07-387.pdf) search, various [static analysis](https://webdocs.cs.ualberta.ca/~mmueller/ps/gpw97.pdf) algorithms and, perhaps, some [machine learning](http://arxiv.org/abs/1412.3409) techniques.

## What this solver can solve

Here are a few problems that this solver can handle in a few seconds:

<img src="https://rawgit.com/d180cf/tsumego.js/master/docs/pics/15197.svg" height="200pt" title="goproblems.com/15197" /><img src="https://rawgit.com/d180cf/tsumego.js/master/docs/pics/13083.svg" height="200pt" title="goproblems.com/13083" /><img src="https://rawgit.com/d180cf/tsumego.js/master/docs/pics/21185.svg" height="200pt" title="goproblems.com/21185" />

They are all rated as 7-9 dan on goproblems.

## What it cannot solve

<img src="https://rawgit.com/d180cf/tsumego.js/master/docs/pics/20222.svg" height="200pt" title="goproblems.com/20222" />

It cannot solve problems with unclear boundaries: if a problem cannot be easily reduced to a problem with a thick outer wall that cannot be captured with 10-25 points inside the wall, then it's an open boundary problem.

## API

```js
const tsumego = require('tsumego.js');

const sgf4 = '(;FF[4]'    
+ 'SZ[9]' // board size    
+ 'AB[ae][be][ce][de][ee][ef][cg][eg][fg][fh][gh][hh][ai][ei][hi]'
+ 'AW[dg][ah][bh][ch][eh][di]'
+ 'MA[ch]' // what needs to be saved
+ 'PL[W])'; // white plays first

const move = tsumego.solve(sgf4); // "W[bf]"
```

## Prepairing a tsumego

The group in question must be surrounded by a thick wall: even diagonal connections aren't allowed. The solver determines the set of available moves (aka the R-zone) by filling the area inside that thick wall. The R-zone problem is probably the hardest problem in tsumego solving algorithms, especially for open boundary tsumegos. A theoretical solution exists - the T. Thompsen's lamda search - but that solution is hard to adopt in a JS solver due to performance reasons.

Luckily, pretty much any enclosed tsumego can be easily converted to a tsumego with a thick wall:

<img src="https://rawgit.com/d180cf/tsumego.js/master/docs/pics/et/1.svg" height="280pt" title="goproblems.com/15283" /><img src="https://rawgit.com/d180cf/tsumego.js/master/docs/pics/et/2.svg" height="280pt" title="goproblems.com/15283" /><img src="https://rawgit.com/d180cf/tsumego.js/master/docs/pics/et/3.svg" height="280pt" title="goproblems.com/15283" />

First, spot the holes in the outer wall.

Some holes are trivial, like `G3`, and can be fixed easily.

Holes like `J3` can be fixed by leaving one or two spaces: the idea is to leave as little space as possible, while not affecting the tsumego. For instance, placing a black stone on `J3` would fix the wall, but also make the white group much weaker, because now black can atari with `F4` and do many other tricks. Placing a black stone on `H2` is better, but still is likely to alter the tsumego: with `H2` black can start a ko with `F4` - something that wasn't possible in the original problem. However leaving white two spaces is good enough: the two spaces do not help black, but make the wall complete. 

Outer liberties like `F6` can be fixed the same way in most cases: by adding missing stones to the wall while leaving those liberties for the inner group. The basic idea of those outer holes is that they give the inner group some extra liberties, but do not let the group escape. If it was possible to escape thru those holes, the problem would be on a completely different level - something that this solver cannot handle. The `F6` hole in the problem above is a bit tricky: it not only gives a liberty to the group, but also presents another tsumego as white can try to capture a piece of the wall at `E8`. The solver cannot see if white can really do anything there, so it needs that hole to be fixed. We see, though, that with a proper defense black can seal white in and thus the hole can be simply fixed while leaving white one liberty - this liberty might help white to live inside.

Finally, mark the target. In theory, the solver can safely assume that black needs to capture all the white stones inside, however this would make the solver considerably slower as targeting one block is easier than targeting all of them. It's likely that in the near future the need to mark the target will be removed. 

## Existing solvers

As far as I know, there are very few tsumego solving software:

- [GoTools](http://lie.math.brocku.ca/gotools/index.php?content=about) is good at fully enclosed tsumegos and can handle up to 14-15 points, as far as I know.
- [Tsumego Explorer](http://webdocs.cs.ualberta.ca/~mmueller/ps/aaai05-tsumego.pdf) is probably the fastest solver for enclosed tsumegos and uses a quite advanced version of depth first proof number search. It can handle tsumegos with up to 22-29 points according to published papers.
- [MiGoS](http://erikvanderwerf.tengen.nl/5x5/5x5solved.html) solves full boards up to 5x6. It uses alpha-beta search (PVS to be precise) with a good evaluation function.
- [MadLab](http://www.t-t.dk/madlab/) can solve open boundary tsumegos using the lambda proof number search. However it's not fast in enclosed ones.
- [XuanXuanGo](http://www.xuanxuango.com/solver.htm) does a stellar job on enclosed tsumegos and can handle many open boundary ones. I don't know what algorithms it uses, though.

None of these are in JS, but some can be embedded in a website in a Java applet. Also, in theory, a C++ solver could be ported to JS with [Emcripten](https://en.wikipedia.org/wiki/Emscripten).
