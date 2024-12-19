import {m} from 'malevic';

import {Button} from '../../controls';

interface PageProps {
    id: string;
    active?: boolean;
    first?: boolean;
    onBackButtonClick?: () => void;
}

export function Page(props: PageProps, content: Malevic.Spec) {
    return (
        <div class={{'page': true, 'page--active': props.active}}>
            <div class="page__content">
                {content}
            </div>
            {props.first ? null : (
                <Button class="page__back-button" onclick={props.onBackButtonClick}>
                    Back
                </Button>
            )}
        </div>
    );
}

interface PageViewerProps {
    activePage: string;
    onBackButtonClick: () => void;
}

export function PageViewer(
    props: PageViewerProps,
    ...pages: Array<Malevic.ComponentSpec<PageProps>>
) {
    return (
        <div class="page-viewer">
            {pages.map((pageSpec, i) => {
                return {
                    ...pageSpec,
                    props: {
                        ...pageSpec.props,
                        active: props.activePage === pageSpec.props.id,
                        first: i === 0,
                        onBackButtonClick: props.onBackButtonClick,
                    },
                } as Malevic.ComponentSpec<PageProps>;
            })}
        </div>
    );
}
