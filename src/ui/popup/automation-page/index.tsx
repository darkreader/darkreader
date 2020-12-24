import {m} from 'malevic';
import type {ViewProps} from '../types';
import EnableExternalConnections from './external-connections';
import LocationAutomation from './location-automation';
import SystemAutomation from './system-automation';
import TimeAutomation from './time-automation';

export default function AutomationPage(props: ViewProps) {

    return (
        <div class={'automation-page'}>
            <TimeAutomation {...props} />
            <LocationAutomation {...props} />
            <SystemAutomation {...props} />
            <EnableExternalConnections {...props} />
        </div>
    );
}
