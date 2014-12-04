module DarkReader.Chrome.Pro.Popup {
    // Access extension from background
    var app = <Application<Generation.FilterConfig>>(<any>chrome.extension.getBackgroundPage()).DarkReader.Chrome.Pro.Background.app;

    // Controls
    var switch_app = document.getElementById('switch-app');

    //document.addEventListener('DOMContentLoaded', onPageLoaded);
    switch_app.addEventListener('click', () => {
        app.switch();
    });
}