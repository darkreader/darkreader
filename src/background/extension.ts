import ConfigManager from './config-manager';
import DevTools from './devtools';
import IconManager from './icon-manager';
import Messenger from './messenger';
import TabManager from './tab-manager';
import UserStorage from './user-storage';
import {getFontList, getCommands, getVersion} from './utils/extension-api';
import {isFirefox} from '../utils/platform';
import {isUrlInList, getUrlHost} from '../utils/url';
import ThemeEngines from '../generators/theme-engines';
import createCSSFilterStylesheet from '../generators/css-filter';
import createStaticStylesheet from '../generators/static-theme';
import {createSVGFilterStylesheet, getSVGFilterMatrixValue, getSVGReverseFilterMatrixValue} from '../generators/svg-filter';
import {FilterConfig, ExtensionData, Shortcuts} from '../definitions';

export class Extension {

    enabled: boolean;
    ready: boolean;

    config: ConfigManager;
    devtools: DevTools;
    filterConfig: FilterConfig;
    fonts: string[];
    icon: IconManager;
    messenger: Messenger;
    tabs: TabManager;
    user: UserStorage;

    constructor() {
        this.ready = false;

        this.icon = new IconManager();
        this.config = new ConfigManager();
        this.devtools = new DevTools(this.config, () => this.onConfigPropChanged());
        this.messenger = new Messenger({
            collect: async () => {
                if (!this.ready) {
                    await new Promise((resolve) => this.awaiting.push(resolve));
                }
                return await this.collectData();
            },
            getActiveTabInfo: async () => {
                if (!this.ready) {
                    await new Promise((resolve) => this.awaiting.push(resolve));
                }
                return await this.tabs.getActiveTabInfo();
            },
            enable: () => this.enable(),
            disable: () => this.disable(),
            setConfig: (config) => this.setConfig(config),
            toggleSitePattern: (pattern) => this.toggleSitePattern(pattern),
            applyDevInversionFixes: (json) => this.devtools.applyInversionFixes(json),
            resetDevInversionFixes: () => this.devtools.resetInversionFixes(),
            applyDevStaticThemes: (text) => this.devtools.applyStaticThemes(text),
            resetDevStaticThemes: () => this.devtools.resetStaticThemes(),
        });
        this.tabs = new TabManager(this.config);
        this.user = new UserStorage();
        this.awaiting = [];
    }

    private registerCommands() {
        if (!chrome.commands) {
            // Fix for Firefox Android
            return;
        }
        chrome.commands.onCommand.addListener((command) => {
            if (command === 'toggle') {
                console.log('Toggle command entered');
                if (this.enabled) {
                    this.enable();
                } else {
                    this.disable();
                }
            }
            if (command === 'addSite') {
                console.log('Add Site command entered');
                this.toggleCurrentSite();
            }
            if (command === 'switchEngine') {
                console.log('Switch Engine command entered');
                const engines = Object.values(ThemeEngines);
                const index = engines.indexOf(this.filterConfig.engine);
                const next = index === engines.length - 1 ? engines[0] : engines[index + 1];
                this.setConfig({engine: next});
            }
        });
    }

    private async getShortcuts() {
        const commands = await getCommands();
        return commands.reduce((map, cmd) => Object.assign(map, {[cmd.name]: cmd.shortcut}), {} as Shortcuts);
    }

    async start() {
        const loadInjections = async () => {
            const readFile = async (path) => {
                const res = await fetch(`${path}?nocache=${Date.now()}`);
                return await res.text();
            };
            const [addStyle, removeStyle, addSVGStyle] = await Promise.all([
                readFile('../inject/add-style.js'),
                readFile('../inject/remove-style.js'),
                readFile('../inject/add-svg-style.js'),
            ]);
            this.scripts = {addStyle, removeStyle, addSVGStyle};
        };

        const loadFonts = async () => {
            const fonts = await getFontList();
            this.fonts = fonts;
        };

        await Promise.all([
            loadInjections(),
            this.config.load(),
            loadFonts(),
        ]);

        const settings = await this.user.loadSettings();
        if (settings.enabled) {
            this.enable();
        } else {
            this.disable();
        }
        console.log('loaded', settings);

        this.registerCommands();

        this.ready = true;
        this.setConfig(settings.config);

        this.awaiting.forEach((ready) => ready());
        this.awaiting = null;
    }

    private awaiting: (() => void)[];

    private async collectData(): Promise<ExtensionData> {
        return {
            enabled: this.enabled,
            filterConfig: this.filterConfig,
            ready: this.ready,
            fonts: this.fonts,
            shortcuts: await this.getShortcuts(),
            version: getVersion(),
            devInversionFixesText: this.devtools.getInversionFixesText(),
            devStaticThemesText: this.devtools.getStaticThemesText(),
        };
    }

    enable() {
        this.enabled = true;
        this.onAppToggle();
    }

    disable() {
        this.enabled = false;
        this.onAppToggle();
    }

    setConfig(config: FilterConfig) {
        this.filterConfig = {...this.filterConfig, ...config};
        this.onConfigPropChanged();
    }

    private async reportChanges() {
        const info = await this.collectData();
        this.messenger.reportChanges(info);
    }

    toggleSitePattern(pattern: string) {
        const siteList = this.filterConfig.siteList.slice();
        const index = siteList.indexOf(pattern);
        if (index < 0) {
            siteList.push(pattern);
        } else {
            siteList.splice(index, 1);
        }
        this.setConfig(Object.assign({}, this.filterConfig, {siteList}));
    }

    /**
     * Adds host name of last focused tab
     * into Sites List (or removes).
     */
    async toggleCurrentSite() {
        const {url} = await this.tabs.getActiveTabInfo();
        const host = getUrlHost(url);
        this.toggleSitePattern(host);
    }


    //------------------------------------
    //
    //       Handle config changes
    //

    protected onAppToggle() {
        if (this.enabled) {

            //
            // Switch ON

            this.icon.setActive();
            this.tabs.injectScriptToAll(this.addStyleCodeGenerator);
            this.tabs.injectOnUpdate(this.addStyleCodeGenerator);

        } else {

            //
            // Switch OFF

            this.icon.setInactive();
            this.tabs.stopInjecting(this.addStyleCodeGenerator);
            this.tabs.injectScriptToAll(this.removeStyleCodeGenerator);
        }
        this.saveUserSettings();
        this.reportChanges();
    }

    protected onConfigPropChanged() {
        if (this.enabled) {
            this.tabs.injectScriptToAll(this.addStyleCodeGenerator);
        }
        this.saveUserSettings();
        this.reportChanges();
    }


    //----------------------
    //
    // Add/remove css to tab
    //
    //----------------------

    private scripts: {addStyle, removeStyle, addSVGStyle};

    private addStyleCodeGenerator = (url: string) => {
        let script = '';
        const {DARK_SITES} = this.config;
        const isUrlInDarkList = isUrlInList(url, DARK_SITES);
        const isUrlInUserList = isUrlInList(url, this.filterConfig.siteList);
        const replaceJSGlobalsWithString = (code: string, replacers: {[global: string]: string}) => {
            return Object.entries(replacers).reduce((str, [g, v]) => {
                return str.split(g).join(`'${v.replace(/\'/g, '\\\'').replace(/\n/g, '\\n')}'`);
            }, code);
        };

        if (
            (isUrlInUserList && this.filterConfig.invertListed)
            || (!isUrlInDarkList
                && !this.filterConfig.invertListed
                && !isUrlInUserList)
        ) {
            console.log(`Creating CSS for url: ${url}`);
            switch (this.filterConfig.engine) {
                case ThemeEngines.cssFilter: {
                    script = replaceJSGlobalsWithString(this.scripts.addStyle, {
                        $CSS: createCSSFilterStylesheet(this.filterConfig, url, this.config.INVERSION_FIXES),
                    });
                    break;
                }
                case ThemeEngines.svgFilter: {
                    if (isFirefox()) {
                        script = replaceJSGlobalsWithString(this.scripts.addStyle, {
                            $CSS: createSVGFilterStylesheet(this.filterConfig, url, this.config.INVERSION_FIXES),
                        });
                    } else {
                        script = replaceJSGlobalsWithString(this.scripts.addSVGStyle, {
                            $CSS: createSVGFilterStylesheet(this.filterConfig, url, this.config.INVERSION_FIXES),
                            $SVG_MATRIX: getSVGFilterMatrixValue(this.filterConfig),
                            $SVG_REVERSE_MATRIX: getSVGReverseFilterMatrixValue(),
                        });
                    }
                    break;
                }
                case ThemeEngines.staticTheme: {
                    script = replaceJSGlobalsWithString(this.scripts.addStyle, {
                        $CSS: createStaticStylesheet(this.filterConfig, url, this.config.STATIC_THEMES),
                    });
                    break;
                }
                default: {
                    throw new Error(`Unknown engine ${this.filterConfig.engine}`);
                }
            }
        } else {
            console.log(`Site is not inverted: ${url}`);
            script = this.scripts.removeStyle;
        }
        return script;
    };

    private removeStyleCodeGenerator = () => {
        return this.scripts.removeStyle;
    };


    //-------------------------------------
    //          User settings

    protected saveUserSettings() {
        this.user.saveSetting({
            enabled: this.enabled,
            config: this.filterConfig,
        }).then((settings) => console.log('saved', settings));
    }
}
