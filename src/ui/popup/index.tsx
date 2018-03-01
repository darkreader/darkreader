import {html, sync} from 'malevic';
import Body from './components/body';
import {getExtension} from '../utils/extension';
import {isAffectedByChromiumIssue750419} from '../utils/issues';
import {Extension} from '../../definitions';

const extension = getExtension();

interface PopupState {
    activeTab?: string;
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
