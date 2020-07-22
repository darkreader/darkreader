import {m} from 'malevic';
import {getContext} from 'malevic/dom';
import {Button} from '../../controls';

interface SiteListProps {
    siteList: string[];
    autoFocus?: boolean;
    onChange: (sites: string[]) => void;
}

export default function SiteList(props: SiteListProps) {
    const context = getContext();
    const store = context.store as {prevSiteList: string[]; wasVisible: boolean; editorNode: HTMLTextAreaElement};
    store.prevSiteList = store.prevSiteList || [];
    store.wasVisible = store.wasVisible || false;

    const {siteList} = props;
    const didSiteListChange = (
        (store.prevSiteList.length !== siteList.length) ||
        store.prevSiteList.some((s, i) => s !== siteList[i])
    );
    store.prevSiteList = siteList;

    function setEditorText() {
        store.editorNode.value = siteList.join('\n') + '\n';
    }

    function onEditorRender(el: HTMLTextAreaElement) {
        store.editorNode = el;

        const isVisible = el.clientHeight > 0;
        const becameVisible = !store.wasVisible && isVisible;

        if (becameVisible || didSiteListChange) {
            setEditorText();
        }

        if (props.autoFocus && becameVisible) {
            el.selectionStart = el.value.length;
            el.selectionEnd = el.value.length;
            el.focus();
        }
        store.wasVisible = isVisible;
    }

    const placeholder = 'www.google.com/maps\nmail.google.com\n';

    function isSiteURLValid(value: string) {
        return /^([^\.\s]+?\.?)+$/.test(value);
    }

    function onApplyClick() {
        let sites = store.editorNode.value
            .split('\n')
            .map((site) => site.trim())
            .filter(isSiteURLValid);
        sites = Array.from(new Set(sites));
        props.onChange(sites);
    }

    function onCancelClick() {
        setEditorText();
    }

    return (
        <div class="site-list">
            <textarea
                class="site-list__editor"
                placeholder={placeholder}
                onrender={onEditorRender}
                autocomplete="off"
                spellcheck="false"
            ></textarea>
            <div class="site-list__buttons">
                <Button
                    class="site-list__button site-list__button-cancel"
                    onclick={onCancelClick}
                >
                    Cancel
                </Button>
                <Button
                    class="site-list__button site-list__button-apply"
                    onclick={onApplyClick}
                >
                    <span class="site-list__button-apply__content">
                        <span class="site-list__button-apply__icon"></span>
                        Apply
                    </span>
                </Button>
            </div>
        </div>
    );
}
