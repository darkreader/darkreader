import {m} from 'malevic';
import {render, getContext} from 'malevic/dom';

interface VirtualScrollProps {
    root: Malevic.Spec;
    items: Malevic.Spec[];
    scrollToIndex?: number | null | undefined;
}

export default function VirtualScroll(props: VirtualScrollProps) {
    if (props.items.length === 0) {
        return props.root;
    }

    const {store} = getContext();

    function renderContent(root: Element, scrollToIndex: number) {
        if (root.clientWidth === 0) {
            return;
        }

        if (store.itemHeight == null) {
            const tempItem = {
                ...props.items[0],
                props: {
                    ...props.items[0].props,
                    oncreate: null,
                    onupdate: null,
                    onrender: null,
                },
            };
            const tempNode = render(root, tempItem).firstElementChild!;
            store.itemHeight = tempNode.getBoundingClientRect().height;
        }
        const {itemHeight} = store;

        const wrapper = render(root, (
            <div
                style={{
                    'flex': 'none',
                    'height': `${props.items.length * itemHeight}px`,
                    'overflow': 'hidden',
                    'position': 'relative',
                }}
            />
        )).firstElementChild;

        if (scrollToIndex >= 0) {
            root.scrollTop = scrollToIndex * itemHeight;
        }
        const containerHeight = document.documentElement.clientHeight - root.getBoundingClientRect().top; // Use this height as a fix for animated height

        // Prevent removing focused element
        let focusedIndex = -1;
        if (document.activeElement) {
            let current = document.activeElement;
            while (current && current.parentElement !== wrapper) {
                current = current.parentElement!;
            }
            if (current) {
                focusedIndex = store.nodesIndices.get(current);
            }
        }

        store.nodesIndices = store.nodesIndices || new WeakMap();
        const saveNodeIndex = (node: Element, index: number) => store.nodesIndices.set(node, index);

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
                    onrender={(node) => saveNodeIndex(node, index)}
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

        render(wrapper!, items);
    }

    let rootNode: Element;
    let prevScrollTop: number;
    const rootDidMount = props.root.props.oncreate;
    const rootDidUpdate = props.root.props.onupdate;
    const rootDidRender = props.root.props.onrender;

    return {
        ...props.root,
        props: {
            ...props.root.props,
            oncreate: rootDidMount,
            onupdate: rootDidUpdate,
            onrender: (node) => {
                rootNode = node;
                rootDidRender && rootDidRender(rootNode);
                // TODO: remove type cast after dependency update
                renderContent(rootNode, isNaN(props.scrollToIndex!) ? -1 : props.scrollToIndex!);
            },
            onscroll: () => {
                if (rootNode.scrollTop === prevScrollTop) {
                    return;
                }
                prevScrollTop = rootNode.scrollTop;
                renderContent(rootNode, -1);
            },
        },
        children: [],
    } as Malevic.Spec;
}
