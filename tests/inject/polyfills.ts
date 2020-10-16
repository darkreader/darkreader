if (!window.hasOwnProperty('chrome')) {
    const listeners = new Set();
    window['chrome'] = {
        runtime: {
            onMessage: {
                addListener: (listener) => {
                    listeners.add(listener);
                },
                removeListener: (listener) => {
                    listeners.delete(listener);
                },
            },
        },
    } as any;
}
