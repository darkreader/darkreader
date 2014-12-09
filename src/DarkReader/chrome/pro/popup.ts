module DarkReader.Chrome.Pro.Popup {

    // Access extension from the background
    var app = <Application<Generation.FilterConfig>>(<any>chrome.extension.getBackgroundPage()).DarkReader.Chrome.Pro.Background.app;
    var controller = new PopupController(app);

}