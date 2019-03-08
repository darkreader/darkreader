import {m, sync} from 'malevic';
import connect from '../connect';
import Body from './components/body';
import {isMobile, isFirefox} from '../../utils/platform';
import {popupHasBuiltInHorizontalBorders, popupHasBuiltInBorders, fixNotClosingPopupOnNavigation} from './utils/issues';
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

document.documentElement.classList.toggle('mobile', isMobile());
document.documentElement.classList.toggle('built-in-borders', popupHasBuiltInBorders());
document.documentElement.classList.toggle('built-in-horizontal-borders', popupHasBuiltInHorizontalBorders());

if (isFirefox()) {
    fixNotClosingPopupOnNavigation();
}
