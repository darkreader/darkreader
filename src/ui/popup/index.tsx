import {html, sync} from 'malevic';
import Body from './components/body';
import createExtensionMock from '../utils/extension-mock';
import {isAffectedByChromiumIssue750419} from '../utils/issues';
import {Extension} from '../../definitions';

interface PopupState {
    activeTab?: string;
}

// Edge fix
if (!window.chrome) {
    window.chrome = {} as any;
}
if (chrome && !chrome.extension && (window as any).browser && (window as any).browser.extension) {
    chrome.extension = (window as any).browser.extension;
}

let extension: Extension;
if (chrome.extension) {
    const bgPage = chrome.extension.getBackgroundPage() as any;
    if (bgPage) {
        extension = bgPage.DarkReader.Background.extension;
    }
}
if (!extension) {
    extension = createExtensionMock();
}

function renderBody() {
    sync(document.body, (
        <Body ext={extension} />
    ));
}

renderBody();

extension.addListener(renderBody);
window.addEventListener('unload', (e) => {
    extension.removeListener(renderBody);
});

if (isAffectedByChromiumIssue750419()) {
    document.documentElement.classList.add('chromium-issue-750419');
}
