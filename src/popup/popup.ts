/// <reference path="../typings/refs.d.ts"/>

module DarkReader.Popup {

    if ((<any>window).chrome && (<any>window).chrome.extension) {
        // Access extension from the background
        var ext = <Extension>(<any>chrome.extension.getBackgroundPage()).DarkReader.Background.extension;
    }
    else {
        // Mock for tests
        var ext = <Extension>xp.observable({
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
        });
    }

    // Create window
    export var popupWindow = new PopupWindow(ext);

    // Disable text selection
    document.onselectstart = (e) => false;
}