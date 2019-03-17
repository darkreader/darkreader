import {m, render, getData} from 'malevic';

interface VirtualScrollProps {
    root: Malevic.Declaration;
    items: Malevic.Declaration[];
    scrollToIndex?: number;
}

const elementsHeights = new WeakMap<Element, number>();

export default function VirtualScroll(props: VirtualScrollProps) {
    if (props.items.length === 0) {
        return props.root;
    }

    function renderContent(root: Element, scrollToIndex: number) {
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

        const wrapper = render(root, (
            <div
                data={VirtualScroll}
                style={{
                    'flex': 'none',
                    'height': `${props.items.length * itemHeight}px`,
                    'overflow': 'hidden',
                    'position': 'relative',
                }}
                native
            />
        ));

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

        const items = props.items
            .map((item, index) => {
                return {item, index};
            })
            .filter(({index}) => {
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
                    key={index}
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

        render(wrapper, items);
    }

    let rootNode: Element;
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
                renderContent(rootNode, isNaN(props.scrollToIndex) ? -1 : props.scrollToIndex);
            },
            didupdate: (node) => {
                rootNode = node;
                rootDidUpdate && rootDidUpdate(rootNode);
                renderContent(rootNode, isNaN(props.scrollToIndex) ? -1 : props.scrollToIndex);
            },
            onscroll: () => {
                if (rootNode.scrollTop === prevScrollTop) {
                    return;
                }
                prevScrollTop = rootNode.scrollTop;
                renderContent(rootNode, -1);
            },
            native: true,
        },
        children: []
    };
}
