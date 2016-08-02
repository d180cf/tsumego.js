module tsumego {
    export class Event<T>{
        private listeners = [];

        add(listener: (arg: T) => void) {
            this.listeners.push(listener);
        }

        remove(listener: (arg: T) => void) {
            const a = this.listeners;
            const i = a.indexOf(listener);

            if (i >= 0)
                a.splice(i, 1);
        }

        fire(arg: T) {
            const a = this.listeners;

            for (let i = 0; i < a.length; i++)
                a[i](arg);
        }
    }
}
