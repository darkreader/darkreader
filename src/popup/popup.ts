module DarkReader.Popup {
    
    // Create window
    export var popupWindow: PopupWindow;

    if ((<any>window).chrome && (<any>window).chrome.extension) {
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
        // Mock for tests
        popupWindow = getMockPopup();
    }

    // Disable text selection
    document.onselectstart = (e) => false;

    function getMockPopup() {
        return new PopupWindow(<Extension>xp.observable({
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
            ]
        }));
    }
}