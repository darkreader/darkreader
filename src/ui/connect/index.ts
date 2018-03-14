import Connector from './connector';
import {createConnectorMock} from './mock';

export default function connect() {
    if (typeof chrome === 'undefined' || !chrome.runtime) {
        return createConnectorMock() as Connector;
    }
    return new Connector();
}
