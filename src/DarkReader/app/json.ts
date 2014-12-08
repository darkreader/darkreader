module DarkReader {

    /**
     * Loads and parses JSON from file to object.
     * @param url Path to JSON file.
     * @param callback Handles parsed result or error.
     */
    export function readJson<T>(url: string, callback: (result: T, error) => void) {
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

    /**
     * Loads and parses JSON from file to object synchronously.
     * @param url Path to JSON file.
     * @param [onerror] Handles parsed result or error.
     */
    export function readJsonSync<T>(url: string, onerror?: (error) => void): T {
        var result: T = null;

        var xobj = new XMLHttpRequest();
        xobj.overrideMimeType("application/json");
        xobj.open('GET', url, false);
        xobj.onreadystatechange = () => {
            if (xobj.readyState == 4 && xobj.status == 200) {
                result = JSON.parse(xobj.responseText);
            }
        };
        xobj.onerror = (err) => {
            if (onerror) {
                onerror(err.error);
            }
            else {
                throw err.error;
            }
        };
        xobj.send(null);

        return result;
    }
} 