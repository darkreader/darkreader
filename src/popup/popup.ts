module DarkReader.Popup {

    // Create window
    export var popupWindow: PopupWindow;

    // Edge fix
    if ((<any>window).chrome && !chrome.extension && (<any>window).browser && (<any>window).browser.extension) {
        chrome.extension = (<any>window).browser.extension;
    }

    if ((<any>window).chrome && chrome.extension) {
        // Access extension from the background
        var background = <typeof DarkReader.Background>(<any>chrome.extension.getBackgroundPage()).DarkReader.Background;

        if (background.extension) {
            popupWindow = new PopupWindow(background.extension);
        } else {
            var onExtLoaded = (ext: DarkReader.Extension) => {
                popupWindow = new PopupWindow(ext);
                background.onExtensionLoaded.removeHandler(onExtLoaded);
            };
            background.onExtensionLoaded.addHandler(onExtLoaded);
        }

        // Remove popup and unbind from model
        window.addEventListener('unload', (e) => {
            popupWindow.scope = null;
            popupWindow.remove();
        });
    }
    else {
        popupWindow = getMockPopup();
    }

    /**
     * Mock for tests.
     */
    function getMockPopup() {
        return new PopupWindow(<Extension><any>xp.observable({
            enabled: true,
            config: <FilterConfig>{
                mode: 1/*DarkReader.FilterMode.dark*/,
                brightness: 110,
                contrast: 80,
                grayscale: 30,
                sepia: 10,
                useFont: false,
                fontFamily: 'Segoe UI',
                textStroke: 0,
                siteList: [
                    'mail.google.com',
                    'npmjs.com'
                ],
                invertListed: false
            },
            fonts: [
                'Arial',
                'B', 'C', 'D', 'E', 'F', 'G', 'H',
                'Open Sans',
                'Segoe UI',
                'T', 'U', 'V', 'W', 'X', 'Y', 'Z'
            ],
            getActiveTabInfo: function (callback) { callback({ host: 'server1.mail.veryverylongnameveryverylongnameveryverylongnameveryverylongname.com' }); }
        }));
    }
}