module DarkReader {

    /**
     * Determines whether URL is in ignore list.
     * @param url URL.
     * @param [list] List to search into. If not specified, the default list will be used.
     */
    export function isUrlInIgnoreList(url: string, list = ignoreList) {
        var found = false;
        list.forEach((t) => {
            if (isUrlMatched(url, t)) {
                found = true;
            }
        });
        if (found)
            console.log('URL ' + url + ' is in ignore list.');

        return found;
    }

    /**
     * Static ignore list.
     */
    export var ignoreList = (function () {
        var list: string[];

        // Try load remote
        list = readJsonSync<string[]>(
            'https://raw.githubusercontent.com/alexanderby/darkreader/master/src/DarkReader/generation/ignore.json',
            // Load locally if error
            function (error) {
                list = readJsonSync<string[]>('ignore.json');
                console.log('Loaded local ignore list. Remote error: ' + error);
            });

        list.sort(urlTemplateSorter);

        return list;
    })();


    /**
     * Determines whether URL matches the template.
     * @param url URL.
     * @param urlTemplate URL template ("google.*", "youtube.com" etc).
     */
    export function isUrlMatched(url: string, urlTemplate: string): boolean {
        var regex = createUrlRegex(urlTemplate);
        return !!url.match(regex);
    }


    function createUrlRegex(urlTemplate: string): RegExp {
        ///^(.*?\:\/\/)?.*?\.?(google\.[^\.]+?)(\/.*)?$/i
        var result = '^(.*?\\:\\/\\/)?[^\/]*?\\.?';

        // Remove protocol?
        urlTemplate = urlTemplate.replace(/^.*?\/\//, '');

        // Remove last slash
        urlTemplate = urlTemplate.replace(/\/$/, '');

        var slashIndex: number;
        var address: string;
        if ((slashIndex = urlTemplate.indexOf('/')) >= 0) {
            address = urlTemplate.substring(0, slashIndex); // google.*
            var path = urlTemplate.substring(slashIndex); // /login/abc
        }
        else {
            address = urlTemplate;
        }

        // Address group
        var addressParts = address.split('.');
        result += '(';
        for (var i = 0; i < addressParts.length; i++) {
            if (addressParts[i] === '*') {
                addressParts[i] = '[^\\.]+?';
            }
        }
        result += addressParts.join('\\.');
        result += ')';

        if (path) {
            // Path group
            result += '(';
            result += path.replace('/', "\\/");
            result += ')';
        }

        result += '(\\/.*)?$';

        var regex = new RegExp(result, 'i');
        return regex;
    }


    /**
     * URL template sorter.
     */
    export var urlTemplateSorter = (a, b) => {
        var slashIndexA = a.url.indexOf('/');
        var slashIndexB = b.url.indexOf('/');
        var addressA = a.url.substring(0, slashIndexA);
        var addressB = b.url.substring(0, slashIndexB);
        var reverseA = addressA.split('.').reverse().join('.').toLowerCase(); // com.google
        var reverseB = addressB.split('.').reverse().join('.').toLowerCase(); // *.google

        // Sort by reversed address descending
        if (reverseA > reverseB) {
            return -1;
        }
        else if (reverseA < reverseB) {
            return 1;
        }
        else {
            // Then sort by path descending
            var pathA = a.url.substring(slashIndexA);
            var pathB = b.url.substring(slashIndexB);
            return -pathA.localeCompare(pathB);
        }
    };
} 