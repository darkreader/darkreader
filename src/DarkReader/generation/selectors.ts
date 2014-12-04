module DarkReader.Generation {

    export interface ContrarySelectors {
        commonSelectors: string;
        specials: UrlSelectors[];
    }

    export interface UrlSelectors {
        urlPattern: string;
        selectors: string;
    }

    /**
     * Loads and parses JSON from file to object.
     * @param url Path to JSON file.
     * @param callback Handles parsed result or error.
     */
    export function parseJsonFile<T>(url: string, callback: (result: T, error) => void) {
        var xobj = new XMLHttpRequest();
        xobj.overrideMimeType("application/json");
        xobj.open('GET', url, true);
        xobj.onreadystatechange = () => {
            if (xobj.readyState == 4 && xobj.status == 200) {
                callback(JSON.parse(xobj.responseText), null);
            }
        };
        xobj.onerror = (err) => {
            callback(null, err.error);
        };
        xobj.send(null);
    }
}