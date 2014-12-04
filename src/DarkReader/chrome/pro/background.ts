var app: DarkReader.Application<{}>;

window.onload = () => {
    // Initialize extension with no configuration
    app = new DarkReader.Chrome.ChromeExtension({}, new DarkReader.Generation.BasicCssGenerator());
} 