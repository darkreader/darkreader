import {HOMEPAGE_URL, BLOG_URL, DEVTOOLS_DOCS_URL, GITHUB_URL, PRIVACY_URL, TWITTER_URL, UNINSTALL_URL, HELP_URL} from './links';

enum CSP {
    NONE = "'none'",
    SELF = "'self'"
}

function check() {
    const prefixed = [BLOG_URL, PRIVACY_URL, UNINSTALL_URL, HELP_URL];
    if (prefixed.some((url) => !url.startsWith(HOMEPAGE_URL))) {
        throw new Error('Some navigation URL is not within main site!');
    }
}

export function prepareCSPMV3(): chrome.runtime.ManifestV3['content_security_policy'] {
    check();

    const result: any = {};
    const policy: any = {
        extension_pages: {
            'default-src': [CSP.NONE],
            'script-src': [CSP.SELF],
            'style-src': [CSP.SELF],
            'img-src': [
                '*',
                'data:',
            ],
            'connect-src': ['*'],
            'navigate-to': [
                CSP.SELF,
                `${HOMEPAGE_URL}/*`,
                DEVTOOLS_DOCS_URL,
                GITHUB_URL,
                TWITTER_URL,
            ],
            'media-src': [CSP.NONE],
            'child-src': [CSP.NONE],
            'worker-src': [CSP.NONE],
            'object-src': [CSP.NONE],
        },
    };
    for (const p in policy) {
        const outputs: string[] = [];
        for (const directive in policy[p]) {
            outputs.push(`${directive} ${policy[p][directive].join(' ')}`);
        }
        result[p] = outputs.join('; ');
    }
    return result;
}
