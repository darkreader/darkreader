module DarkReader.Chrome.Pro.Popup {

    // Access extension from the background
    var app = <Application<Generation.FilterConfig>>(<any>chrome.extension.getBackgroundPage()).DarkReader.Chrome.Pro.Background.app;

    // Create controller
    var controller = new PopupController(app);

    // Disable text selection
    document.onselectstart = (e) => false;

}