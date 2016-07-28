This is an attempt to find optimal weights for the following params:

```js
// maximize the number of captured stones first
+ w[0] * S(r)

// minimize the number of own blocks in atari
+ w[1] * S(tsumego.mgen.ninatari(board, +color))

// minimize/maximize the number of libs of the target
+ w[2] * S(tnlibs * color * tsumego.sign(target))

// maximize the number of own liberties
+ w[3] * S(tsumego.mgen.sumlibs(board, +color))

// maximize the number of the opponent's blocks in atari
+ w[4] * S(tsumego.mgen.ninatari(board, -color))

// minimize the number of the opponent's liberties
+ w[5] * S(tsumego.mgen.sumlibs(board, -color))

// some randomness
+ w[6] * S(random() - 0.5)
```

Currently the solver uses the following weights, that were guessed:

```js
[1e-0, -1e-1, 1e-2, 1e-3, 1e-4, -1e-5, 1e-6]
```

However with the gradient descent method the weights quickly converge to the following values:

```js
[2.7921, -0.2013, -0.0016, -0.7590, -0.1929, -0.5606, 0.0007]
```

The first two weights look ok, the rest aren't.

# Build

Run `jake test[tsum;logsgf:1;log:1]` to make `logs.json` file. Copy it then to the adjuster folder and there run `tsc && node .bin\adjuster.js`. Initial weights and the eps value can be set too:

`tsc && node .bin\adjuster.js 0.001 [2.7,-0.2,-0.0,-0.7,-0.1,-0.5,0.0]`

The output look like this:

```
eps = 0.001
w = [2.7019,-0.2144,-0.0043,-0.7353,-0.1937,-0.5287,0.0123]
loading solved positions...
546616 positions loaded
adjusting positions...
w = [2.7036,-0.2164,-0.0022,-0.7395,-0.1877,-0.5338,0.0056]
w = [2.7091,-0.2079,-0.0016,-0.7390,-0.1927,-0.5379,0.0016]
w = [2.7160,-0.2077,0.0005,-0.7372,-0.2038,-0.5379,0.0057]
w = [2.7214,-0.1974,0.0015,-0.7343,-0.2058,-0.5357,0.0017]
w = [2.7219,-0.1912,-0.0036,-0.7390,-0.2020,-0.5431,-0.0015]
```