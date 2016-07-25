module tsumego {
    export class SortedArray<T> {
        private items: T[];
        private flags: [number][];

        /** 
         * The items will be sorted in such a way that
         * compare(flags[i], flags[i + 1]) <= 0 for every i:
         * To sort items in a specific order:
         *
         *      ascending:  (a, b) => a - b
         *      descending: (a, b) => b - a
         *
         * To sort first by one field in the ascneding order
         * and then by another field in the descending order:
         *
         *      (a, b) => 
         *          a[0] - b[0] ||
         *          a[1] - b[1];
         *
         * This is exactly how Array::sort works.
         */
        constructor() {

        }

        reset() {
            this.flags = [];
            this.items = [];

            return this.items;
        }

        /**
         * Inserts a new item in a "stable" way, i.e.
         * if items are taken from one array which is
         * sorted according to some criteria #A and inserted
         * into this array, not only the items will be
         * sorted here by the new criteria #B, but also items
         * for which #B doesn't define a specific order
         * (returns zero in other words), will be correctly
         * ordered according to #A. More strictly, for any i < j:
         *
         *      1. B(sa[i], sa[j]) <= 0
         *      2. if B(sa[i], sa[j]) = 0 then A(sa[i], sa[j]) <= 0
         *
         * This property allows to compose a few sorted arrays.
         */
        insert(item: T, flag: [number]) {
            const {items, flags} = this;

            let i = items.length;

            // it sounds crazy, but passing around this single number
            // inside a one element array is way faster than passing
            // this number alone: 10s vs 14s (!)
            while (i > 0 && flags[i - 1][0] < flag[0])
                i--;

            // using .push when i == n and .unshift when i == 0
            // won't make the solver run faster
            items.splice(i, 0, item);
            flags.splice(i, 0, flag);

            return i;
        }
    }
}
