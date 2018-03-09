import {html, sync} from 'malevic';
import Body from './components/body';
import {getExtension} from '../utils/extension';
import {isAffectedByChromiumIssue750419} from '../utils/issues';
import {isFirefox} from '../../background/utils';
import {Extension} from '../../definitions';

const extension = getExtension();

interface PopupState {
    activeTab?: string;
}

function renderBody() {
    if (!extension.ready) {
        if (!document.getElementById('not-ready-message')) {
            document.body.appendChild(sync(
                document.createElement('div'),
                <div id="not-ready-message">Loading...</div>
            ));
        }
        return;
    }
    sync(document.body, (
        <Body ext={extension} />
    ));
}

renderBody();

extension.addListener(renderBody);
window.addEventListener('unload', (e) => {
    extension.removeListener(renderBody);
});

if (isFirefox()) {
    document.documentElement.classList.add('firefox');
}

if (isAffectedByChromiumIssue750419()) {
    document.documentElement.classList.add('chromium-issue-750419');
}
