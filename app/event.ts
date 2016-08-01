module testbench {
    export class Event<Listener extends (...args) => void> {
        private listeners: Listener[] = [];

        add(listener: Listener) {
            this.listeners.push(listener);
        }

        fire(...args) {
            for (const listener of this.listeners) {
                try {
                    listener(...args);
                } catch (err) {
                    console.log('an event listener has thrown an error:', err && err.stack || err);
                }
            }
        }
    }
}
