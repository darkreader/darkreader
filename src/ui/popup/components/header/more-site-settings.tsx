import { m } from 'malevic';
import { Button, CheckBox, Shortcut } from '../../../controls';
import type { ExtWrapper } from '../../../../definitions';
import { DONATE_URL } from '../../../../utils/links';
import { getLocalMessage } from '../../../../utils/locales';
import KeyboardIcon from '../../main-page/keyboard-icon';

type MoreSiteSettingsProps = ExtWrapper & {
    isExpanded: boolean;
    onClose: () => void;
};

export default function MoreSiteSettings({
    data,
    actions,
    isExpanded,
    onClose,
}: MoreSiteSettingsProps) {
    function toggleDetectDarkTheme() {
        actions.changeSettings({
            detectDarkTheme: !data.settings.detectDarkTheme,
        });
    }

    return (
        <div
            class={{
                'header__more-site-settings': true,
                'header__more-settings': true,
                'header__more-settings--expanded': isExpanded,
            }}
        >
            <div class='header__more-settings__top'>
                <span class='header__more-settings__top__text'>
                    {getLocalMessage('site_toggle')}
                </span>
                <span
                    class='header__more-settings__top__close'
                    role='button'
                    onclick={onClose}
                >
                    ✕
                </span>
            </div>
            <div class='header__more-settings__content'>
                <div
                    class={[
                        'header__more-settings__line',
                        'header__more-settings__detect-dark-theme',
                    ]}
                >
                    <CheckBox
                        class='header__more-settings__detect-dark-theme__checkbox'
                        checked={data.settings.detectDarkTheme}
                        onchange={toggleDetectDarkTheme}
                    />
                    <Button
                        class={{
                            'header__more-settings__detect-dark-theme__button':
                                true,
                            'header__more-settings__detect-dark-theme__button--active':
                                data.settings.detectDarkTheme,
                        }}
                        onclick={toggleDetectDarkTheme}
                    >
                        {getLocalMessage('detect_dark_theme')}
                    </Button>
                </div>
                <p class='header__more-settings__description'>
                    {getLocalMessage('detect_website_dark_theme')}
                </p>
                <span
                    class={{
                        'header__more-settings__shortcut-wrapper': true,
                        'header__more-settings__shortcut-wrapper--set':
                            data.shortcuts['toggle'],
                    }}
                >
                    <Shortcut
                        class={{
                            'header__more-settings__shortcut': true,
                            'header__more-settings__shortcut--set':
                                data.shortcuts['toggle'],
                        }}
                        commandName='addSite'
                        shortcuts={data.shortcuts}
                        textTemplate={(hotkey) =>
                            hotkey
                                ? hotkey
                                : getLocalMessage('click_to_set_shortcut')
                        }
                        onSetShortcut={(shortcut) =>
                            actions.setShortcut('addSite', shortcut)
                        }
                    />
                    <KeyboardIcon />
                </span>
                <p class='header__more-settings__description'>
                    {getLocalMessage('website_toggle_shortcut')}
                </p>
                <div class='header__more-settings__donate'>
                    <a
                        class='donate-link'
                        href={DONATE_URL}
                        target='_blank'
                        rel='noopener noreferrer'
                    >
                        <span class='donate-link__text'>
                            {getLocalMessage('donate')}
                        </span>
                    </a>
                    <p class='header__more-settings__description'>
                        {getLocalMessage('support_out_work')}
                    </p>
                </div>
            </div>
        </div>
    );
}
