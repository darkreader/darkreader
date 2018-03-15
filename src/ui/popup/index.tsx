import {html, sync} from 'malevic';
import connect from '../connect';
import Body from './components/body';
import {isAffectedByChromiumIssue750419} from '../utils/issues';
import {isFirefox} from '../../background/utils';
import {ExtensionData, ExtensionActions, TabInfo} from '../../definitions';

function renderBody(data: ExtensionData, tab: TabInfo, actions: ExtensionActions) {
    sync(document.body, (
        <Body data={data} tab={tab} actions={actions} />
    ));
}

async function start() {
    const connector = connect();
    window.addEventListener('unload', (e) => connector.disconnect());

    const [data, tab] = await Promise.all([
        connector.getData(),
        connector.getActiveTabInfo(),
    ]);
    renderBody(data, tab, connector);
    connector.subscribeToChanges((data) => renderBody(data, tab, connector));
}

start();

document.documentElement.classList.toggle('firefox', isFirefox());
document.documentElement.classList.toggle('chromium-issue-750419', isAffectedByChromiumIssue750419());
