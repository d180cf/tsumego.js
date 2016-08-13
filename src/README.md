# Search

The core of the solver is the plain depth-first search. It took quite a bit of effort to make it work with repetitions (aka "ko") and identical positions (aka "transpositions"). Despite this solver uses neither static analysis (e.g. the benson's test) nor advaced search strategies, it can quickly solve most of enclosed tsumegos on goproblems.com (once they are properly enclosed):

<img src="https://rawgit.com/d180cf/tsumego.js/master/docs/pics/12354.svg#1" height="200pt" /><img src="https://rawgit.com/d180cf/tsumego.js/master/docs/pics/21185.svg#1" height="200pt" />

The 1-st problem (white to live) is solved in 3s (168K nodes) and is [rated](http://www.goproblems.com/12354) as 6 dan. The 2-nd one (white to live) needs 21s (1.2M nodes) and is [rated](http://www.goproblems.com/21185) as 8 dan.

There are two ways to make the solver faster: make it spend less time on each node and make it explore less nodes. Obviously, once the solver is made smarter and starts exploring less nodes, it naturally starts spending more time on each node. It often happens that some tricky optimization lets it explore 1.3 less nodes, but also makes it spend 1.5x more time in each node, thus making a negative effect overall.

#### Optimizing code

This reduces the time spent in each node, while leavs the overall number of nodes to be explored unchanged. I've made a few surprising discoveries about performance in the v8 js engine:

- bool to int coercion `+b` on a hot path can slow down search by 10-20% - I'm wondering what kind of asm is generated for this simple operation
- a common `t && t[x] || 0` trick in a hash map implementation can screw performance
- such a trivial function, though on a hot path, eats up 10% of the time if `lift` and `_inBounds` together need only 0.17%:

    ```js
    Board.prototype.getBlockId = function getBlockId(x, y) {
        return this._inBounds(x, y) ? this.lift(this.table[y * this.size + x]) : 0;
    };
    ```

  hard to believe that one multiplication, additon and a lookup in a small array need to much time.

#### Advanced search strategies

Perhaps the biggest problem with the plain depth-first search is that if it picks a wrong move at the top of the search tree, it won't return until it proves that this move is wrong. This is why it cannot solve tsumegos bigger than 20 points: it picks a wrong move and then spends the rest of the time disproving that dumb move.

Advanced search algorithms, like alpha-beta or df-pn, are aiming at this problem: they discover at some point that the chosen branch of the tree is likely to be wrong and back up to try another one. As a result, they explore less nodes to find a solution, but they explore the same nodes multiple times.

#### Static analysis

It can be used to quickly recognize surely dead or alive groups. The key word here is "quickly" - if such static analysis allows to explore 5x less nodes, but in return makes exploring each node 7x slower, the net effect will be negative. It's appeared that even the simplest static analysis techniques, such as the benson's test or the Euler heuristics, is very hard to squeeze into that narrow window, e.g. the benson's test allows to explore 1.2x less nodes, but makes exploring each node 1.6x slower.

# Transpositions

The transposition table is just a fancy name for the cache of solved positions. In a typical tsumego the solver creates about 800K TT entires and these are just unconditional results, i.e. those that don't depend on the sequence of moves that lead to them. Solved intermediate positions have to be cached because otherwise the search will become ~100x slower.

The TT is just a hash table where the key is the hash of the position (one position actually corresponds to 2 entires: when black plays first and when white plays first). In JS integer numbers are 32 bits and it might seem enough to use 32 bit keys as a typical tsumegos has 10-25 available points, but in fact the expected number of collisions in a hash table is

<img src="http://latex.codecogs.com/gif.latex?E(n,m)=n-m+m(1-\frac{1}{m})^n\sim\frac{n^2}{2m}" />

where `n` is the number of entires and `m` is the number of entries that the key can address, which is simply `2**32` or `2**64`, depending on the key size. This gives 125 collisions for 1M positions and 32 bit keys and one collision per 32 million tsumegos if 64 bit keys are used. This is why the solver uses 64 bit keys, despite it's so inconvenient in JS.

# Repetitions

Many complications come from repetitions. In the simplest case it's a basic ko. More complicated cases may produce very long cycles. This position is known as the 10,000-year ko:

<img src="https://rawgit.com/d180cf/tsumego.js/master/docs/pics/10k-year-ko/1.svg#1" height="200pt" /><img src="https://rawgit.com/d180cf/tsumego.js/master/docs/pics/10k-year-ko/2.svg#1" height="200pt" />

These two positions correspond to 4 nodes in the search:

- `W1` when white is to play on the 1-st position
- `B1` when black is to play on the 1-st position
- `W2` when white is to play on the 2-nd position
- `B2` when black is to play on the 2-nd position

When there are no external ko treats and the search starts at `W1`, it sees that the two moves on the right don't work for white and it captures the black stone, doing `W1` → `B2`.

At `B2` it sees that black cannot play the two moves on the right and cannot recapture the stone either, as there are no ko treats, so black passes, doing `B2` → `W2`.

At `W2` it sees that if white plays either of the two moves on the right, black can recapture the stone and then capture white, as there are no ko treats. The search also finds that if white plays the move on the left, to stop the ko, it gets a dead shape. Thus white's only option is to pass: `W2` → `B2`.

At `B2` again the search sees that black can recapture the stone, since the white's pass before has reset the history of moves (a local pass means playing elsewhere): `B2` → `W1`.

At `W1` the search discovers that white cannot recapture the stone right now and has to pass: `W1` → `B1`.

At `B1` if black plays either of the two moves on the right (which would be the right thing to do if there were ko treats), white can recapture the stone and then capture black, so black has to pass: `B1` → `W1`.

At `W1` white can now recapture the stone, finishing the long loop: `W1` → `B2` → `W2` → `B2` → `W1` → `B1` → `W1`. At this point the search needs to admit that white lives if there are no external ko treats.

# Passing

The second most annoying problem is passing because it never appears when solving tsumegos manually, but appears pretty much always in the search.

#### Passing once

In the simplest case when black passes, white has a chance to start the search from sctratch, without the need to look back at the history of moves. Normally, when considering the next move, there is a sequence of moves that leaded to the current  position and repeating any of the previous positions is not allowed unless the current player is the ko master. However when black passes locally, it can actually play a move elsewhere on the board: this changes the whole-board history of moves, but locally the position isn't affected. This is why when black passes, the local history of moves is reset and white might have more possible moves. In the search, once black passes, the solver adds a record to remind itself that here white started the search with no history and the ko master was black, for example. These records look like this:

```
    hash=1bcedf player=W km=B
    hash=b4c609 player=B km=B
    ...
```

Once the solver is about to add a new such record, it checks if the same record was already added before: this would mean that white already started the search in the same exact situation and now it's about to start it again. This is how the solver detects long loops, such as the one in the 10,000-year ko position.

#### Passing twice

Passing one more time has an additional meaning. If black passed and then white passed too, black can in theory repeat these two passes as many times as needed. This can be useful if white is the ko master: every time black passes, it actually removes a ko treat elsewhere on the board, and once all ko treats are removed, black can play a move, now in assumption that neither side has ko treats.  

<img src="https://rawgit.com/d180cf/tsumego.js/master/docs/pics/1-step-ko.svg#1" height="200pt" />

In this example if white is the ko master and it has just captured the black stone, black cannot recapture it back. However black can pass and then white will pass too. Now black can remove all ko treats and recapture the white stone because after passing the local history of moves is reset. However white won't be able to recapture the stone back because it doesn't have ko treats anymore, so black wins.

This won't be the case if white had infinitely many ko treats, e.g. when there is a double ko elsewhere on the board:

<img src="https://rawgit.com/d180cf/tsumego.js/master/docs/pics/double-ko.svg#1" height="200pt" />


