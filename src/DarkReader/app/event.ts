module DarkReader {
    /**
     * Event.
     */
    export class Event<TEventArgs>
    {
        private _handlers: { handler: EventHandler<TEventArgs>; scope: any; }[] = [];

        /**
         * Adds event handler.
         * @param handler Function which will be called when event happens.
         * @param thisArg Context of handler.
         */
        addHandler(handler: EventHandler<TEventArgs>, thisArg: any) {
            this._handlers.push({ handler: handler, scope: thisArg });
        }

        /**
         * Removes event handler.
         */
        removeHandler(handler: EventHandler<TEventArgs>): EventHandler<TEventArgs> {
            var found = null;
            var index = -1;
            this._handlers.every((current, i) => {
                if (current.handler === handler) {
                    index = i;
                    found = current.handler;
                    return false;
                }
                else {
                    return true;
                }
            });
            if (index >= 0) {
                this._handlers.splice(index, 1);
            }

            return found;
        }

        /**
         * Fires the event.
         * @param args Event arguments.
         */
        invoke(args: TEventArgs) {
            this._handlers.forEach((item) => {
                item.handler.call(item.scope, args);
            });
        }
    }

    /**
     * Function which handles an event.
     */
    export interface EventHandler<TEventArgs> {
        /**
         * @param args Event arguments.
         */
        (args: TEventArgs): void;
    }
}