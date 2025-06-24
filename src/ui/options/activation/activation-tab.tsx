import {m} from 'malevic';
import {getContext} from 'malevic/dom';

import type {ViewProps} from '../../../definitions';
import {DONATE_URL} from '../../../utils/links';
// import {getLocalMessage} from '../../../utils/locales';
import {Button, ControlGroup, TextBox} from '../../controls';

export function ActivationTab(props: ViewProps): Malevic.Child {
    const context = getContext();
    const store = context.getStore({
        emailTextElement: null as (HTMLInputElement | null),
        keyTextElement: null as (HTMLInputElement | null),
        errorMessage: '',
        checking: false,
    });

    if (!props.data.uiHighlights.includes('anniversary')) {
        return (
            <div
                class={{
                    'settings-tab': true,
                    'activation-tab': true,
                }}
            >
                <div class="activation__success-message">
                    Activation was successful
                </div>
                <ControlGroup>
                    <ControlGroup.Control class="activation__reset-control">
                        <Button
                            class="activation__reset-control__button"
                            onclick={() => {
                                store.checking = true;
                                store.errorMessage = '';
                                context.refresh();
                                props.actions.resetActivation();
                                store.checking = false;
                            }}
                        >
                            Reset
                        </Button>
                    </ControlGroup.Control>
                </ControlGroup>
                <div class="activation__thumb-up">
                    <img src="../assets/images/darkreader-thumb-up.svg" />
                </div>
            </div>
        );
    }

    const activate = () => {
        if (store.checking) {
            return;
        }

        const email = store.emailTextElement?.value.trim() ?? '';
        const key = store.keyTextElement?.value.trim() ?? '';

        store.errorMessage = '';
        store.checking = true;
        context.refresh();
        props.actions.startActivation(email, key);
        store.errorMessage = 'Please check your email and key';
        store.checking = false;
    };

    return <div
        class={{
            'settings-tab': true,
            'activation-tab': true,
            'activation-tab--checking': store.checking,
        }}
    >
        <ControlGroup>
            <ControlGroup.Control class="activation__get-code-control">
                <a href={DONATE_URL} target="_blank" rel="noopener noreferrer">
                    Get activation code
                </a>
            </ControlGroup.Control>
        </ControlGroup>
        <ControlGroup>
            <ControlGroup.Control class="activation__email-control">
                <TextBox
                    class="activation__email-control__text"
                    placeholder="example@gmail.com"
                    onchange={(e: {target: HTMLInputElement}) => e.target.value}
                    oncreate={(node: HTMLInputElement) => {
                        store.emailTextElement = node;
                    }}
                    onkeypress={(e) => {
                        if (e.key === 'Enter') {
                            store.keyTextElement?.focus();
                        }
                    }}
                />
            </ControlGroup.Control>
            <ControlGroup.Description>
                Email
            </ControlGroup.Description>
        </ControlGroup>
        <ControlGroup>
            <ControlGroup.Control class="activation__key-control">
                <TextBox
                    class="activation__key-control__text"
                    placeholder="XXXX-XXXX-XXXX-XXXX"
                    onchange={(e: {target: HTMLInputElement}) => e.target.value}
                    oncreate={(node: HTMLInputElement) => {
                        store.keyTextElement = node;
                    }}
                    onkeypress={(e) => {
                        if (e.key === 'Enter') {
                            store.keyTextElement?.blur();
                            activate();
                        }
                    }}
                />
            </ControlGroup.Control>
            <ControlGroup.Description>
                Code
            </ControlGroup.Description>
        </ControlGroup>
        <ControlGroup>
            <ControlGroup.Control class="activation__activate-control">
                <Button
                    class="activation__activate-control__button"
                    onclick={activate}
                >
                    Activate
                </Button>
            </ControlGroup.Control>
            <ControlGroup.Description>
                Activate the code
            </ControlGroup.Description>
        </ControlGroup>
        <ControlGroup>
            <ControlGroup.Control>
                <div class="activation__error">
                    {store.errorMessage}
                </div>
            </ControlGroup.Control>
        </ControlGroup>
    </div>;
}
