import {html, sync} from 'malevic';
import Body from './components/body';
import {getExtension} from '../utils/extension';

const extension = getExtension();

function renderBody() {
    sync(document.body, <Body ext={extension} />);
}

renderBody();

extension.addListener(renderBody);
window.addEventListener('unload', (e) => {
    extension.removeListener(renderBody);
});
