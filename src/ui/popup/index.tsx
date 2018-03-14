import {html, sync} from 'malevic';
import connect from '../connect';
import Body from './components/body';
import {isAffectedByChromiumIssue750419} from '../utils/issues';
import {isFirefox} from '../../background/utils';
import {ExtensionData, ExtensionActions} from '../../definitions';

function renderBody(data: ExtensionData, actions: ExtensionActions) {
    if (!data.ready) {
        if (!document.getElementById('not-ready-message')) {
            document.body.appendChild(sync(
                document.createElement('div'),
                <div id="not-ready-message">Loading...</div>
            ));
        }
        return;
    }
    sync(document.body, (
        <Body data={data} actions={actions} />
    ));
}

async function start() {
    const connector = connect();
    window.addEventListener('unload', (e) => connector.disconnect());

    const data = await connector.getData();
    renderBody(data, connector);
    connector.subscribeToChanges((data) => renderBody(data, connector));
}

start();

if (isFirefox()) {
    document.documentElement.classList.add('firefox');
}

if (isAffectedByChromiumIssue750419()) {
    document.documentElement.classList.add('chromium-issue-750419');
}
