import {html, render} from 'malevic';
import {Button} from '../../../controls';
import {Extension} from '../../../../definitions';

export default function SiteToggleButton({ext}: {ext: Extension}) {

    let buttonNode: HTMLElement;

    function saveButtonNode(node: HTMLElement) {
        buttonNode = node;
    }

    function updateUrl(urlNode: HTMLElement) {
        ext.getActiveTabInfo((info) => {
            const toggleHasEffect = (
                ext.enabled &&
                !info.isProtected &&
                (ext.filterConfig.invertListed || !info.isInDarkList)
            );

            buttonNode.classList.toggle('site-toggle--disabled', !toggleHasEffect);

            if (info.host) {
                render(
                    urlNode,
                    // Break URLs at dots.
                    info.host.split('.').reduce((elements, part, i) => {
                        return elements.concat(
                            <wbr />,
                            `${i > 0 ? '.' : ''}${part}`
                        );
                    }, [])
                );
            } else {
                render(urlNode, 'current site');
            }
        });
    }

    return (
        <Button
            class="site-toggle"
            onclick={() => ext.toggleCurrentSite()}
            didmount={saveButtonNode}
            didupdate={saveButtonNode}
        >
            Toggle <span
                class="site-toggle__url"
                native
                didmount={updateUrl}
                didupdate={updateUrl}
            />
        </Button>
    );
}
