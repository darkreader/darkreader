module DarkReader.Background {

    // Initialize extension
    export var extension: DarkReader.Extension;
    export var onExtensionLoaded = new xp.Event<Extension>();
    loadConfigs(() => {
        extension = new DarkReader.Extension(
            new DarkReader.FilterCssGenerator());
        onExtensionLoaded.invoke(extension);
    });

    if (DEBUG) {
        // Reload extension on connection
        const listen = () => {
            const req = new XMLHttpRequest();
            req.open('GET', 'http://localhost:8890/', true);
            req.onload = () => {
                if (req.status >= 200 && req.status < 300) {
                    chrome.runtime.reload();
                } else {
                    setTimeout(listen, 2000);
                }
            };
            req.onerror = () => setTimeout(listen, 2000);
            req.send();
        };
        setTimeout(listen, 2000);
    }
}
