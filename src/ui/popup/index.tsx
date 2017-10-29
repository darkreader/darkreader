import { html, render } from 'malevic';
import Body from './body';
import { Extension } from '../../background/extension';

interface PopupState {
    activeTab?: string;
}

const extension = (chrome.extension.getBackgroundPage() as any).DarkReader.Background.extension as Extension;
let state: PopupState = null;

function renderBody() {
    render(document.body, (
        <Body
            ext={extension}
            activeTab={state.activeTab}
            onSwitchTab={(tab) => setState({ activeTab: tab })}
        />
    ));
}

function setState(newState: PopupState) {
    state = { ...state, ...newState };
    renderBody();
}

setState({
    activeTab: null
});

extension.addListener(renderBody);
window.addEventListener('unload', (e) => {
    extension.removeListener(renderBody);
});
