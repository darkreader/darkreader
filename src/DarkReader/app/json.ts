module DarkReader {

    /**
     * Loads and parses JSON from file to object.
     * @param params Object containing request parameters.
     */
    export function readJson<T>(params: JsonRequestParams<T>) {
        var xobj = new XMLHttpRequest();
        xobj.overrideMimeType("application/json");
        xobj.open('GET', params.url, params.async);
        xobj.onreadystatechange = () => {
            if (xobj.readyState == 4) {
                if (xobj.status == 200) {
                    params.onSuccess(JSON.parse(xobj.responseText));
                }
                else {
                    var error = new Error(xobj.status + ': ' + xobj.statusText);
                    if (params.onFailure) {
                        params.onFailure(error);
                    }
                    else {
                        throw error;
                    }
                }
            }
        };
        xobj.onerror = (err) => {
            if (params.onFailure) {
                params.onFailure(err.error);
            }
            else {
                throw err.error;
            }
        };
        xobj.send(null);
    }

    export interface JsonRequestParams<T> {
        url: string;
        async: boolean;
        onSuccess: (result: T) => void;
        onFailure?: (error) => void;
    }
} 