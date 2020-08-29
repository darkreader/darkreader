// @ts-check

module.exports = {
    compress:
    /**
     * @param {string} string
     */

    function (string) {
        const dict = {};
        const data = (string + '').split('');
        const out = [];
        let currChar;
        let phrase = data[0];
        let code = 256;
        for (let i = 1, len = data.length ; i < len; i++) {
            currChar = data[i];
            if (dict[phrase + currChar] != null) {
                phrase += currChar;
            } else {
                out.push(phrase.length > 1 ? dict[phrase] : phrase.charCodeAt(0));
                dict[phrase + currChar] = code;
                code++;
                phrase = currChar;
            }
        }
        out.push(phrase.length > 1 ? dict[phrase] : phrase.charCodeAt(0));
        for (let i = 0, len = out.length; i < len; i++) {
            out[i] = String.fromCharCode(out[i]);
        }
        return out.join('');
    }
};
