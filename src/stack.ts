module tsumego {
    export class Stack<T> {
        private items: T[] = [];
        public length = 0;

        push(item: T) {
            this.items[this.length++] = item;
        }

        pop(): T {
            return this.length > 0 ? this.items[--this.length] : null;
        }

        *[Symbol.iterator]() {
            for (let i = 0; i < this.length; i++)
                yield this.items[i];
        }
    }
}
