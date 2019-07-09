import {m} from 'malevic';
import {sync} from 'malevic/dom';
import Body from './components/body';
import connect from '../connect';

function renderBody(data, actions) {
    sync(document.body, <Body data={data} actions={actions} />);
}

async function start() {
    const connector = connect();
    window.addEventListener('unload', (e) => connector.disconnect());

    const data = await connector.getData();
    renderBody(data, connector);
    connector.subscribeToChanges((data) => renderBody(data, connector));
}

start();
