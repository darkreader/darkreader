import {Extension, FilterConfig, TabInfo} from '../../definitions';

export default function createExtensionMock() {
    let listener: () => void = null;
    const extension: Extension = {
        enabled: true,
        config: {
            mode: 1,
            brightness: 110,
            contrast: 90,
            grayscale: 20,
            sepia: 10,
            useFont: false,
            fontFamily: 'Segoe UI',
            textStroke: 0,
            invertListed: false,
            siteList: []
        },
        fonts: [
            '8514oem',
            'Arial',
            'Arial Black',
            'Bahnschrift',
            'Bahnschrift Light',
            'Bahnschrift SemiBold',
            'Bahnschrift SemiLight',
            'Calibri',
            'Calibri Light',
            'Cambria',
            'Cambria Math',
            'Candara',
            'Comic Sans MS',
            'Consolas',
            'Constantia',
            'Corbel',
            'Courier',
            'Courier New',
            'Ebrima',
            'Fixedsys',
            'Franklin Gothic Medium',
            'Gabriola',
            'Gadugi',
            'Georgia',
            'HoloLens MDL2 Assets',
            'Impact',
            'Javanese Text',
            'Leelawadee UI',
            'Leelawadee UI Semilight',
            'Lucida Console',
            'Lucida Sans Unicode',
            'MS Gothic',
            'MS PGothic',
            'MS Sans Serif',
            'MS Serif',
            'MS UI Gothic',
            'MV Boli',
            'Malgun Gothic',
            'Malgun Gothic Semilight',
            'Marlett',
            'Microsoft Himalaya',
            'Microsoft JhengHei',
            'Microsoft JhengHei Light',
            'Microsoft JhengHei UI',
            'Microsoft JhengHei UI Light',
            'Microsoft New Tai Lue',
            'Microsoft PhagsPa',
            'Microsoft Sans Serif',
            'Microsoft Tai Le',
            'Microsoft YaHei',
            'Microsoft YaHei Light',
            'Microsoft YaHei UI',
            'Microsoft YaHei UI Light',
            'Microsoft Yi Baiti',
            'MingLiU-ExtB',
            'MingLiU_HKSCS-ExtB',
            'Modern',
            'Mongolian Baiti',
            'Myanmar Text',
            'NSimSun',
            'Nirmala UI',
            'Nirmala UI Semilight',
            'PMingLiU-ExtB',
            'Palatino Linotype',
            'Roman',
            'Script',
            'Segoe MDL2 Assets',
            'Segoe Print',
            'Segoe Script',
            'Segoe UI',
            'Segoe UI Black',
            'Segoe UI Emoji',
            'Segoe UI Historic',
            'Segoe UI Light',
            'Segoe UI Semibold',
            'Segoe UI Semilight',
            'Segoe UI Symbol',
            'SimSun',
            'SimSun-ExtB',
            'Sitka Banner',
            'Sitka Display',
            'Sitka Heading',
            'Sitka Small',
            'Sitka Subheading',
            'Sitka Text',
            'Small Fonts',
            'Sylfaen',
            'Symbol',
            'System',
            'Tahoma',
            'TeamViewer11',
            'Terminal',
            'Times New Roman',
            'Trebuchet MS',
            'Verdana',
            'Webdings',
            'Wingdings',
            'Yu Gothic',
            'Yu Gothic Light',
            'Yu Gothic Medium',
            'Yu Gothic UI',
            'Yu Gothic UI Light',
            'Yu Gothic UI Semibold',
            'Yu Gothic UI Semilight',
        ],
        enable() {
            extension.enabled = true;
            listener();
        },
        disable() {
            extension.enabled = false;
            listener();
        },
        setConfig(config) {
            Object.assign(extension.config, config);
            listener();
        },
        addListener(callback) {
            listener = callback;
        },
        removeListener(callback) {
            listener = null;
        },
        getActiveTabInfo(callback) {
            callback({
                url: 'http://darkreader.org/',
                host: 'darkreader.org',
                isProtected: false,
                isInDarkList: false,
            });
        },
        toggleCurrentSite() {
            extension.config.siteList.length ?
                extension.config.siteList.splice(0) :
                extension.config.siteList.push('darkreader.org');
            listener();
        },
    };
    return extension;
}
