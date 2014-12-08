module DarkReader.Chrome.Pro.Popup {

    // Access extension from background
    var app = <Application<Generation.FilterConfig>>(<any>chrome.extension.getBackgroundPage()).DarkReader.Chrome.Pro.Background.app;
    console.log(app);
    var controller = new PopupController(app);

}