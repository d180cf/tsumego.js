type int = number;
type uint = number;
type XIndex = uint;
type YIndex = uint;
type Color = int;
type GIndex = int;

interface XYIndex {
    x: XIndex;
    y: YIndex;
}

interface Result {
    color: int;
    repd: number;
    /**
     * The winning move.
     * If the only solution is a loss, no move is stored.
     */
    move?: XYIndex;
}

interface Solution {
    /** 
     * The number of ko treats that will be enough to let white win.
     * Negative values represent white's ko treats, while positive
     * represent black's ko treats. From time to time this number
     * can be increased, but never reduced because if white can win
     * with n ko treats, then it can also win with n - 1 ko treat
     * (remember that negative values represent white's ko treats).
     */
    wmin: number;
    /**
     * The number of ko treats that will be enough to let black win.
     * This number can be negative to tell that white has ko treats
     * while black has none. From time to time this number can be reduced
     * but never increased because if black can win with n ko treats,
     * then it can also win with n + 1 ko treats.
     */
    bmax: number;
    /**
     * The best move. Obviously, it's absent if there is no way to win.
     */
    move?: XYIndex;
}
