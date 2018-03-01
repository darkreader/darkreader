import { Extension } from './extension';
import { FilterCssGenerator } from './filter_css_generator';
import { loadConfigs, DEBUG } from './config_management';

    // Initialize extension
    let extension: Extension;
    loadConfigs(() => {
        extension = new Extension(
            new FilterCssGenerator());

        (window as any).DarkReader = (window as any).DarkReader || {};
        (window as any).DarkReader.Background = (window as any).DarkReader.Background || {};
        (window as any).DarkReader.Background.extension = extension;
    });

    if (DEBUG) {
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
