module DarkReader.Chrome.Pro.Popup {
    // Access extension from background
    //var app = (<any>chrome.extension.getBackgroundPage()).app;
    var app = <DarkReader.Application<{}>>(<any>chrome.extension.getBackgroundPage()).app;

    // Controls
    var checkbox_enabled = <HTMLInputElement>document.getElementById('enabled');
    var block_status = document.getElementById('status');

    function onPageLoaded() {

    }

    function onCheckboxValueChanged() {
        var enabled = checkbox_enabled.checked;
        if (enabled) {
            app.enable();
        }
        else {
            app.disable();
        }
        // Status message
        block_status.textContent = 'App state changed';
        setTimeout(function () {
            block_status.textContent = '';
        }, 1000);
    }

    document.addEventListener('DOMContentLoaded', onPageLoaded);
    checkbox_enabled.addEventListener('change', onCheckboxValueChanged);
}