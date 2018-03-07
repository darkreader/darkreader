import {html, render, plugins, getData, NodeDeclaration} from 'malevic';

interface VirtualScrollProps {
    root: NodeDeclaration;
    items: NodeDeclaration[];
    scrollToIndex?: number;
}

type Match = [NodeDeclaration, Element];

plugins.render.matchNodes.add(({d, element}) => {
    if (!(d.attrs && d.attrs.data === VirtualScroll)) {
        return null;
    }

    const elements = Array.from(element.children);
    const elementsByIndex = elements.reduce((map, el) => map.set(getData(el), el), new Map<number, Element>());

    const declarations: NodeDeclaration[] = (d.children[0] as Function)(element);
    return declarations.map((c: NodeDeclaration) => [c, elementsByIndex.get(c.attrs.data) || null] as Match);
});

const elementsHeights = new WeakMap<Element, number>();

export default function VirtualScroll(props: VirtualScrollProps) {
    if (props.items.length === 0) {
        return props.root;
    }

    function getContent({scrollToIndex}) {
        return (root: HTMLElement) => {
            let itemHeight: number;
            if (elementsHeights.has(root)) {
                itemHeight = elementsHeights.get(root);
            } else {
                const tempItem = {
                    ...props.items[0],
                    attrs: {
                        ...props.items[0].attrs,
                        didmount: null,
                        didupdate: null
                    }
                };
                const tempNode = render(root, tempItem);
                itemHeight = tempNode.getBoundingClientRect().height;
                elementsHeights.set(root, itemHeight);
            }

            return (
                <div
                    data={VirtualScroll}
                    style={{
                        'flex': 'none',
                        'height': `${props.items.length * itemHeight}px`,
                        'overflow': 'hidden',
                        'position': 'relative',
                    }}
                >
                    {(wrapper) => {
                        if (scrollToIndex >= 0) {
                            root.scrollTop = scrollToIndex * itemHeight;
                        }
                        const containerHeight = document.documentElement.clientHeight - root.getBoundingClientRect().top; // Use this height as a fix for animated height

                        // Prevent removing focused element
                        let focusedIndex = -1;
                        if (document.activeElement) {
                            let current = document.activeElement;
                            while (current && current.parentElement !== wrapper) {
                                current = current.parentElement;
                            }
                            if (current) {
                                focusedIndex = getData(current);
                            }
                        }

                        return props.items
                            .map((item, index) => {
                                return {item, index};
                            })
                            .filter(({item, index}) => {
                                const eTop = index * itemHeight;
                                const eBottom = (index + 1) * itemHeight;
                                const rTop = root.scrollTop;
                                const rBottom = root.scrollTop + containerHeight;
                                const isTopBoundVisible = eTop >= rTop && eTop <= rBottom;
                                const isBottomBoundVisible = eBottom >= rTop && eBottom <= rBottom;
                                return isTopBoundVisible || isBottomBoundVisible || focusedIndex === index;
                            })
                            .map(({item, index}) => (
                                <div
                                    data={index}
                                    style={{
                                        'left': '0',
                                        'position': 'absolute',
                                        'top': `${index * itemHeight}px`,
                                        'width': '100%',
                                    }}
                                >
                                    {item}
                                </div>
                            ));
                    }}
                </div>
            );
        };
    }

    let rootNode: Element;
    const saveRootRef = (node) => rootNode = node;
    let prevScrollTop: number;
    const rootDidMount = props.root.attrs && props.root.attrs.didmount;
    const rootDidUpdate = props.root.attrs && props.root.attrs.didupdate;

    return {
        ...props.root,
        attrs: {
            ...props.root.attrs,
            didmount: (node) => {
                rootNode = node;
                rootDidMount && rootDidMount(rootNode);
            },
            didupdate: (node) => {
                rootNode = node;
                rootDidUpdate && rootDidUpdate(rootNode);
            },
            onscroll: (e) => {
                if (rootNode.scrollTop === prevScrollTop) {
                    return;
                }
                prevScrollTop = rootNode.scrollTop;
                render(rootNode, getContent({scrollToIndex: -1}) as any);
            }
        },
        children: [getContent({scrollToIndex: isNaN(props.scrollToIndex) ? -1 : props.scrollToIndex})]
    };
}
