module DarkReader.Popup {
    
    /**
     * Tab panel.
     */
    export class TabPanel extends xp.VBox {
        private buttonsContainer: xp.HBox;
        private tabsContainer: xp.HBox;
        private tabs: Tab[];
        onTabSwitched: xp.Event<Tab>;

        constructor(markup: TabPanelMarkup, tabs: Tab[]) {
            super(markup, [
                new xp.HBox({
                    style: 'tabPanelButtons',
                    init: (el) => this.buttonsContainer = el
                }),
                new xp.HBox({
                    style: 'tabPanelContainer',
                    init: (el) => this.tabsContainer = el
                })
            ]);

            //
            // Add tabs

            this.tabs = [];
            tabs.forEach((t) => this.addTab(t));
        }

        protected initEvents() {
            super.initEvents();
            this.onTabSwitched = new xp.Event();
            this.onRemoved.addHandler(() => this.onTabSwitched.removeAllHandlers());
        }

        protected getTemplate() {
            const t = super.getTemplate();
            t.classList.add('TabPanel');
            return t;
        }

        addTab(tab: Tab) {
            // Create tab button
            const button = new xp.Button({
                style: 'tabPanelButton',
                onClick: () => this.switchTab(tab),
                useParentScope: false,
                scope: tab,
                text: '{tabName}',
                //init: (el: xp.Button) => el.bind('text', 'tabName', tab)
            });
            this.buttonsContainer.append(button);

            this.tabsContainer.append(tab);
            this.tabs.push(tab);

            if (this.tabs.length === 1) {
                this.switchTab(tab);
            }
        }

        removeTab(tab: Tab) {
            const tabIndex = this.tabs.indexOf(tab);
            if (tabIndex < 0) {
                throw new Error('Tab panel doesn\'t contain this tab.');
            }

            this.tabs.splice(tabIndex, 1);
            tab.remove();
            this.buttonsContainer.children[tabIndex].remove();
            if (tab.active && this.tabs.length > 0) {
                this.switchTab(this.tabs[0]);
            }
        }

        switchTab(tab: Tab) {
            const tabIndex = this.tabs.indexOf(tab);
            if (tabIndex < 0) {
                throw new Error('Tab panel doesn\'t contain this tab.');
            }

            this.buttonsContainer.children.forEach((b) => b.domElement.classList.remove('active'));
            this.buttonsContainer.children[tabIndex].domElement.classList.add('active');

            this.tabs.forEach((t) => t.active = false);
            tab.active = true;

            this.onTabSwitched.invoke(tab);
        }
    }

    export interface TabPanelMarkup extends xp.VBoxMarkup<TabPanel> {
        onTabSwitched?: (t: Tab) => void;
    }

    /**
     * Tab.
     */
    export class Tab extends xp.VBox {
        tabName: string;
        active: boolean;

        constructor(markup: TabMarkup, children: xp.Element[]) {
            super(markup, children);
        }

        protected getTemplate() {
            const t = super.getTemplate();
            t.classList.add('Tab');
            return t;
        }

        protected defineProperties() {
            super.defineProperties();
            this.defineProperty('tabName', {
                observable: true
            });
            this.defineProperty('active', {
                getter: () => this.domElement.classList.contains('active'),
                setter: (active: boolean) => {
                    if (active) {
                        this.domElement.classList.add('active');
                    } else {
                        this.domElement.classList.remove('active');
                    }
                }
            });
        }
    }

    export interface TabMarkup extends xp.VBoxMarkup<Tab> {
        tabName: string;
        active?: boolean;
    }
}
