import { html, render } from 'malevic';
import { Row, Col, Button, Toggle } from '../controls';
import { Extension } from '../../background/extension';

export default function SiteToggleButton(props: { ext: Extension }) {
    const { ext } = props;

    function updateButtonText(node: HTMLButtonElement) {
        ext.getActiveTabInfo((info) => {
            const toggleHasEffect = (
                ext.enabled &&
                info.canInjectScript &&
                (ext.config.invertListed || !info.isInDarkList)
            );

            node.classList.toggle('disabled', !toggleHasEffect);

            if (info.host) {
                // Note: Try to break URLs at dots.
                render(node, (
                    <span>
                        {info.host.split('.').reduce((elements, part) => {
                            return elements.concat(
                                <wbr />,
                                <span>{part}</span>
                            );
                        }, [])}
                    </span>
                ));
            } else {
                render(node, 'current site');
            }
        });
    }

    return () => (
        <Button
            id="siteToggle"
            onclick={() => ext.toggleCurrentSite()}
            native
            didmount={updateButtonText}
            didupdate={updateButtonText}
        />
    );
}
