[![Build Status](https://travis-ci.org/d180cf/tsumego.js.svg?branch=master)](https://travis-ci.org/d180cf/tsumego.js)

It's a simplistic tsumego solver in JS that I write in my spare time. At the moment this solver doesn't implement any advanced algorithms and is able to solve only basic problems in which all possible moves (up to ~10) and the target are set manually. The plan is to implement the [lambda df-pn(r)](http://www.ijcai.org/papers07/Papers/IJCAI07-387.pdf) search, various [static analysis](https://webdocs.cs.ualberta.ca/~mmueller/ps/gpw97.pdf) algorithms and, perhaps, some [ANN](http://arxiv.org/abs/1412.3409) techniques.

```
  A B C D E F G H J
9 - - - - - - O X -
8 X O - - O O O X -
7 - X O O X X X X -
6 - X X X - - - - -
5 - - - - - - - - - 
```

It's an example of a [problem](http://www.goproblems.com/18629) that this solver can handle: it can figure out that if white plays first at `C8`, it lives without a ko.

As far as I know, there are very few tsumego solving software:

- Thomas Wolf's [GoTools](http://lie.math.brocku.ca/gotools/index.php?content=about)
- Martin Muller's Tsumego Explorer and [Fuego](https://github.com/svn2github/fuego) (the latter is actually a bot, not just a solver)
- Erik van der Werf's [MIGOS](http://erikvanderwerf.tengen.nl/5x5/5x5solved.html)

None of these are in JS, but some can be embedded in a website in a Java applet.
