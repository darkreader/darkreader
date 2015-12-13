module DarkReader.Background {

    // Initialize extension
    export var extension: DarkReader.Extension;
    export var onExtensionLoaded = new xp.Event<Extension>();
    loadConfigs(() => {
        extension = new DarkReader.Extension(
            new DarkReader.FilterCssGenerator());
        onExtensionLoaded.invoke(extension);
    });

}