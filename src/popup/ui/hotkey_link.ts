module DarkReader.Popup {

    /**
     * Displays a hotkey and navigates 
	 * to Chrome Commands page on click.
     */
    export class HotkeyLink extends xp.Label {
        protected getTemplate() {
            return xp.Dom.create({ tag: 'label', attrs: { class: 'Label shortcut' } });
        }

        commandName: string;
        noHotkeyText: string;
        hotkeyTextTemplate: string;

        constructor(markup: HotkeyLinkMarkup) {
            super(markup);
            this.setupText();
        }
        
        // TODO: Bind to chrome command shortcut change if possible.
        setupText() {
            if (!chrome.commands) {
                this.text = 'Chrome hotkey';
                return;
            }
            // TODO: Edit chrome type definition.
            (<any>chrome.commands).getAll((commands: { description: string; name: string; shortcut: string; }[]) => {
                if (commands) {
                    var cmd = commands.filter((c) => c.name === this.commandName)[0];
                    if (cmd) {
                        this.text = cmd.shortcut ?
                            this.hotkeyTextTemplate.replace(/#HOTKEY/g, cmd.shortcut)
                            : this.noHotkeyText;
                    } else {
                        throw new Error(`Command "${this.commandName}" not found.`);
                    }
                }
            });
        }

        protected initEvents() {
            super.initEvents();
            this.onClick.addHandler((e) => {
                chrome.tabs.create({
                    url: `chrome://extensions/configureCommands#command-${chrome.runtime.id}-${this.commandName}`,
                    active: true
                });
            });
        }
    }

    export interface HotkeyLinkMarkup extends xp.LabelMarkup<HotkeyLink> {
        commandName: string;
        noHotkeyText: string;
        hotkeyTextTemplate: string;
    }
} 