module testbench {
    'use strict';

    export class Subscription {
        constructor(public dispose: () => void) {
        }
    }

    export module keyboard {
        export enum Key {
            Esc = 27,
            F10 = 121,
            F11 = 122
        }

        /**
         *  hook(122, event => {
         *      // ...
         *  });
         */
        export function hook(key: Key, handler: (event: KeyboardEvent) => void) {
            const listener = (event: KeyboardEvent) => {
                if (event.which != key)
                    return;

                handler(event);
            };

            document.addEventListener('keydown', listener);
            return new Subscription(() => document.removeEventListener('keydown', listener));
        }
    }
}
