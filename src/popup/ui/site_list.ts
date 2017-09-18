module DarkReader.Popup {
    // TODO: Grid cells behaviour.

    /**
     * Site list.
     */
    export class SiteList extends xp.VBox {
        sites: xp.ObservableCollection<string>;
        children: xp.TextBox[];
        private sitesChangeRegistrar: xp.EventRegistrar;

        constructor(markup: SiteListMarkup) {
            super(markup);

            // Add one extra Text box
            this.addTextBox('', void (0), true);
        }

        protected getTemplate() {
            var t = super.getTemplate();
            t.classList.add('SiteList');
            return t;
        }

        protected defineProperties() {
            super.defineProperties();

            this.sitesChangeRegistrar = new xp.EventRegistrar();
            this.defineProperty('sites', {
                setter: (sites: xp.ObservableCollection<string>) => {
                    this.sitesChangeRegistrar.unsubscribeAll();
                    if (!sites) {
                        return;
                    }
                    this.sitesChangeRegistrar.subscribe(sites.onCollectionChanged, (args) => {
                        switch (args.action) {
                            case xp.CollectionChangeAction.Create:
                                this.addTextBox(args.newItem, args.newIndex);
                                break;
                            case xp.CollectionChangeAction.Delete:
                                this.removeTextBox(args.oldIndex);
                                break;
                            case xp.CollectionChangeAction.Replace:
                                this.children[args.newIndex].text = args.newItem;
                                break;
                            default:
                                throw new Error('Not implemented.');
                        }
                    });
                    sites.forEach((s, i) => this.addTextBox(s, i));
                }
            });
        }

        private addTextBox(site: string, index?: number, isExtraTextBox?: boolean) {
            var textBox = new xp.TextBox({
                text: site,
                style: 'siteListTextBox',
                placeholder: 'mail.google.com, google.*/mail etc...',
                onTextChange: (e) => {
                    var i = this.children.indexOf(textBox);
                    var value = e.newText.trim();
                    var isValueValid = !!value.match(/^([^\.\s]+?\.?)+$/);
                    if (isExtraTextBox) {
                        if (isValueValid) {
                            // Add new site
                            this.sites.push(value);
                            textBox.text = '';
                            this.focus();
                        }
                    }
                    else {
                        if (isValueValid) {
                            // Replace value
                            this.sites[i] = value;
                        }
                        else {
                            // Remove from list
                            this.sites.splice(i, 1);
                        }
                    }
                }
            });
            if (index === void (0)) { index = this.children.length; }
            this.insert(textBox, index);
        }

        private removeTextBox(index: number) {
            var textBox = this.children[index];
            textBox.remove();
        }

        /**
         * Sets focus to the last extra text box.
         */
        focus() {
            this.children[this.children.length - 1].focus();
            const container = this.parent.domElement;
            container.scrollTop = container.scrollHeight;
        }
    }

    export interface SiteListMarkup extends xp.VBoxMarkup<SiteList> {
        sites?: xp.ObservableCollection<string> | string;
    }
} 