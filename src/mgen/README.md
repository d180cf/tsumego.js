### Moves ordering

Nothing fancy here: every move in the list given by a moves generator
is assigned a few properties, such as the number of stones it
captures or the number of liberties it gains/takes, and then
the list is sorted based on these properties.

Perhaps a better approach would be to use a simple neural network:
it could assign a score to each move based on these properties
and then the moves could be sorted based on this score.

### Fixed-zone moves generator

Here the set of possible moves needs to be determined manually
before the search starts and then the search uses moves from this set.
It's obviously quite fast for simple enclosed problems. For more or less
open boundary problems it's often hard to determine a fixed set of moves
beforehand as the search often ends up not being able to play moves
beyond the boundary of this set even though there is plenty of space there:

```
  A B C D
1 - - -
2 - X -
3 - - - - - 
4 - X X X - - 
5 - O O O X -
6 - - - O X - - -
7 - - - O X - X -
8 - - - - - - - -
```

This is a typical case when it's not clear whether the search should be
allowed to play moves like `A3` - if it's included in the set, then the search
will be trying it every time `O` loses, but if it's not included, then `O`
can simply play at `A4` and `X` won't be able to play at `A3` to capture since
`A3` wasn't included.

### Distance-based moves generator

The idea is to generate moves that are reasonably close
to the target block. In other words, at every move, the
generator assigns to every cell a "distance" property that
tells how far that cell is from the target block and if the
distance is less than 4, for example, then that cell is included
to the list of possible moves.

The rules for computing the distance are quite simple:

- The target block gets `d = 0`.
- Liberties of the target block have `d = 1`.
- Neighbors of those liberties have `d = 2` and so on.
- Blocks adjacent to a cell with `d = N` have the same `d = N`. This allows to jump to distant areas via connecting to friendly stones. See how `G3` can be reached from `B2` in just 3 moves:

  ```
     A B C D E F G
  1  - - - - - - -
  2  - X X 1 - - -
  3  - - - 2 X X 3
  ```

- If an enemy block with `K` libs is adjacent to a cell with `d = N`, then libs of that block get `d = N + K`. This allows to consider moves that break thru enemy walls and in general gives a good heuristics for when to play outside.

  ```
     A B C D E F G
  1  - - - - 7 7 7
  2  - 3 B B B B B
  3  3 B W W W W B
  4  3 B W - W - -
  ```
  
  Here `B` surrounds the `C3` block. It can be seen that `d(D4) = d(F4) = 1` and `d(G4) = 2`. After that `W` has no room to simply extend, but `W` has two adjacent blocks: `B3` with 3 libs and `C2` with 7 libs. This is why the moves on the left get `d=3` while moves on the top get `d=7` and since only moves with `d < 4` are considered, moves on the top won't be tried.
  
This won't be good enough in some cases, when there are holes in the wall:

```
- A B C D
1 - W B -
2 - W B -
3 - W B 3
4 W W 1 2
5 B B B 3
6 - - - -
```

Here `B` plays at `A2` to capture, but once `W` realises that there is no way to make two eyes, it may start playing out all `d < 4` moves, thuse forcing `B` to restart the search. Obviously, there must be a way to discard some obviously non-working moves, such as `D4`. There is a simple observation that helps to detect such moves: if `W` plays at `D4` - a reasonably looking `d=2` move - `B` can block at `C4` suddenly making `d(D4) = 8`. Hence the heuristics to prune such moves. In the example above, this leaves `W` only one move outside - `B2`. The two other moves - `A3` and `A4` - also have `d = 3`, but `B` can simply block at `B2` to make the distance to `A3` and `A4` unreasonably high.

As far as the winning move, if it exists, always appears in the `d < 4` subset, the search will be able to find it. If there is no winning move, it's profitable for the search to try as few moves as possible. However once the winning move appears too far, i.e. has a high distance value, the search won't be able to see it. This is the case in some semeai problems where both groups have quite a few libs and the winnig move is played somewhere outside to setup oiotoshi. The [lambda-search](http://www.t-t.dk/publications/lambda_lncs.pdf) won't have this problem, though.
