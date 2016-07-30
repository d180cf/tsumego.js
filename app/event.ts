module testbench {
    export class Event<Listener extends (...args) => void> {
        private listeners: Listener[] = [];

        add(listener: Listener) {
            this.listeners.push(listener);
        }

        fire(...args) {
            for (const listener of this.listeners)
                listener(...args);
        }
    }
}
