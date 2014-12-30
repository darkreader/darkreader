module DarkReader.Chrome.Pro.Background {

    var defaultConfig: DarkReader.Generation.FilterConfig = {
        mode: DarkReader.Generation.FilterMode.dark,
        brightness: 110,
        contrast: 80,
        grayscale: 30,
        sepia: 10,
        usefont: false,
        fontfamily: 'Segoe UI',
        textstroke: 0,
        ignorelist: []
    };

    // Initialize extension
    export var app = new DarkReader.Chrome.Extension(
        defaultConfig,
        new DarkReader.Generation.FilterCssGenerator('-webkit-'));

}