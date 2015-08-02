/// <reference path="../typings/refs.d.ts"/>

module DarkReader.Background {

    // Initialize extension
    export var extension: DarkReader.Extension;
    loadConfigs(() => {
        extension = new DarkReader.Extension(
            new DarkReader.FilterCssGenerator());
    });

}