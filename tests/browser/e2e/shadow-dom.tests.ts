import {multiline} from '../../support/test-utils';
import type {StyleExpectations} from '../globals';

async function expectStyles(styles: StyleExpectations) {
    await expectPageStyles(expect, styles);
}

describe('Custom HTML elements', () => {
    // TODO: remove flakes and remove this line
    jest.retryTimes(10, {logErrorsBeforeRetry: true});

    it('Asynchronous define', async () => {
        // Temporarily disable this test on Firefox
        if (product === 'firefox') {
            expect(true);
            return;
        }

        await loadTestPage({
            '/': multiline(
                '<!DOCTYPE html>',
                '<html>',
                '<head>',
                '</head>',
                '<body></body>',
                '</html>',
            ),
        });

        await pageUtils.evaluateScript(async () => {
            class ElementWitAsync extends HTMLElement {
                constructor() {
                    super();
                    const root = this.attachShadow({mode: 'open'});
                    setTimeout(() => root.innerHTML =
                        '<style>\
                            p { color: red; }\
                        </style>\
                        <p>\
                            Should be red initially and then change to green.\
                        </p>'
                    );
                }
            }

            customElements.define('elem-with-async', ElementWitAsync);
            const elem = document.createElement('elem-with-async');
            document.body.appendChild(elem);
        });

        await expectStyles([
            [['elem-with-async', 'p'], 'color', 'rgb(255, 26, 26)'],
        ]);

        await devtoolsUtils.paste(multiline(
            '*',
            '',
            'CSS',
            'p {',
            '    color: green !important;',
            '}',
        ));

        await expectStyles([
            [['elem-with-async', 'p'], 'color', 'rgb(0, 128, 0)'],
        ]);

        await devtoolsUtils.reset();
    });
});
