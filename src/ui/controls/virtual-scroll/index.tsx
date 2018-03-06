import {html, render, NodeDeclaration} from 'malevic';

interface VirtualScrollProps {
    root: NodeDeclaration;
    items: NodeDeclaration[];
    focusedItemIndex?: number;
}

const elementsHeights = new WeakMap<Element, number>();

export default function VirtualScroll(props: VirtualScrollProps) {
    if (props.items.length === 0) {
        return props.root;
    }

    function getContent({scrollToIndex}) {
        return (domNode: HTMLElement) => {
            let itemHeight: number;
            if (elementsHeights.has(domNode)) {
                itemHeight = elementsHeights.get(domNode);
            } else {
                const tempItem = {
                    ...props.items[0],
                    attrs: {
                        ...props.items[0].attrs,
                        didmount: null,
                        didupdate: null
                    }
                };
                const tempNode = render(domNode, tempItem);
                itemHeight = tempNode.getBoundingClientRect().height;
                elementsHeights.set(domNode, itemHeight);
            }
            if (scrollToIndex >= 0) {
                domNode.scrollTop = scrollToIndex * itemHeight;
            }
            const indices = props.items.reduce((map, item, i) => map.set(item, i), new Map());
            const style = getComputedStyle(domNode);
            const hasHeightTransition = (style.transitionProperty === 'all' && style.transitionDuration !== '0s') || style.transition.indexOf('height') >= 0;
            const containerHeight = hasHeightTransition ? document.documentElement.clientHeight - domNode.getBoundingClientRect().top : domNode.clientHeight;

            return (
                <div
                    style={{
                        'flex': 'none',
                        'height': `${props.items.length * itemHeight}px`,
                        'position': 'relative',
                    }}
                >
                    {props.items
                        .filter((item) => {
                            const index = indices.get(item);
                            const isTopBoundVisible = index * itemHeight <= domNode.scrollTop + containerHeight;
                            const isBottomBoundVisible = (index + 1) * itemHeight > domNode.scrollTop;
                            return isTopBoundVisible && isBottomBoundVisible;
                        })
                        .map((item, i) => {
                            return {
                                ...item,
                                attrs: {
                                    ...item.attrs,
                                    style: {
                                        'left': '0',
                                        'position': 'absolute',
                                        'top': `${indices.get(item) * itemHeight}px`,
                                        'width': '100%',
                                    }
                                }
                            };
                        })}
                </div>
            );
        };
    }

    let rootNode: Element;
    const saveRootRef = (node) => rootNode = node;
    const update = () => render(rootNode, getContent({scrollToIndex: -1}) as any);

    return {
        ...props.root,
        attrs: {
            ...props.root.attrs,
            didmount: saveRootRef,
            didupdate: saveRootRef,
            onscroll: update,
            ontransitionend: update,
        },
        children: [getContent({scrollToIndex: isNaN(props.focusedItemIndex) ? -1 : props.focusedItemIndex})]
    };
}
