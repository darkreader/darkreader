module DarkReader.Chrome.Starter.Background {
    
    // Initialize extension with no configuration
    var app = new DarkReader.Chrome.Extension({}, new DarkReader.Generation.BasicCssGenerator());

    // On extension button click
    chrome.browserAction.onClicked.addListener((tab) => {
        // Toggle app state
        app.toggle();
    });
}