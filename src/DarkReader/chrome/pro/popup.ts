module DarkReader.Chrome.Pro.Popup {
    // Access extension from background
    var app = <Application<Generation.FilterConfig>>(<any>chrome.extension.getBackgroundPage()).DarkReader.Chrome.Pro.Background.app;

    // Controls
    var toggle_app = document.getElementById('toggle-app');

    //document.addEventListener('DOMContentLoaded', onPageLoaded);
    toggle_app.addEventListener('click', () => {
        app.toggle();
    });
}