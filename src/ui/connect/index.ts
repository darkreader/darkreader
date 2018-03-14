import Connector from './connector';
import {ExtensionInfo} from '../../definitions';

export default function connect() {
    return new Connector();
}
