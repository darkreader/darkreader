var app: DarkReader.Application<{}>;

var ActiveIconPath = 'img/dr_active_19.png';
var InactiveIconPath = 'img/dr_inactive_19.png';

window.onload = () => {
    // Define extension
    app = new DarkReader.Chrome.StarterExtension(new DarkReader.Generation.BasicCssGenerator());

    // Default icon
    chrome.browserAction.setIcon({ path: InactiveIconPath });

    app.onSwitch.addHandler((isEnabled) => {
        // Change icon
        chrome.browserAction.setIcon({
            path: isEnabled ? ActiveIconPath : InactiveIconPath
        });
    }, window);

    // On button click
    chrome.browserAction.onClicked.addListener((tab) => {
        // Switch app state
        app.isEnabled = !app.isEnabled;
    });
} 