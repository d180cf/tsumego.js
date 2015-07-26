[![Build Status](https://travis-ci.org/d180cf/tsumego.js.svg?branch=master)](https://travis-ci.org/d180cf/tsumego.js)

It's a simplistic tsumego solver in JS. At the moment this solver doesn't implement any advanced algorithms and is able to solve only basic problems in which all possible moves (up to ~10) and the target are set manually. The plan is to implement the [lambda df-pn(r)](http://www.ijcai.org/papers07/Papers/IJCAI07-387.pdf) search and various static analysis algorithms.

```
  A B C D E F G H J
9 - - - - - - O X -
8 X O - - O O O X -
7 - X O O X X X X -
6 - X X X - - - - -
5 - - - - - - - - - 
```

It's an example of a [problem](http://www.goproblems.com/18629) that this solver can handle: it can figure out that if white plays first at `C8`, it lives without a ko.
