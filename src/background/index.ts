import {Extension} from './extension';

// Initialize extension
const extension = new Extension();
extension.start();

(window as any).DarkReader = (window as any).DarkReader || {};
(window as any).DarkReader.Background = (window as any).DarkReader.Background || {};
(window as any).DarkReader.Background.extension = extension;

if (extension.config.DEBUG) {
    // Reload extension on connection
    const listen = () => {
        const req = new XMLHttpRequest();
        req.open('GET', 'http://localhost:8890/', true);
        req.onload = () => {
            if (req.status >= 200 && req.status < 300) {
                chrome.runtime.reload();
            } else {
                setTimeout(listen, 2000);
            }
        };
        req.onerror = () => setTimeout(listen, 2000);
        req.send();
    };
    setTimeout(listen, 2000);
}
