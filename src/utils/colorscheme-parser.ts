// Seperator is to indicate that the it should start with a new defined colorscheme.
const SEPERATOR = '='.repeat(32);

// Just a few constants to make the code more readable.
const backgroundPropertyLength = 'background: '.length;
const textPropertyLength = 'text: '.length;

// Should return a humanized version of the given number.
// For example:
// humanizeNumber(0) => '0'
// humanizeNumber(1) => '1st'
// humanizeNumber(2) => '2nd'
// humanizeNumber(3) => '3rd'
// humanizeNumber(4) => '4th'
// TODO(Anton): rewrite me with case-default
// eslint-disable-next-line
// @ts-ignore
const humanizeNumber = (number: number): string => {
    if (number > 3) {
        return `${number}th`;
    }
    switch (number) {
        case 0:
            return '0';
        case 1:
            return '1st';
        case 2:
            return '2nd';
        case 3:
            return '3rd';
    }
};

// Should return if the given string is a valid 3 or 6 digit hex color.
const isValidHexColor = (color: string): boolean => {
    return /^#([0-9a-fA-F]{3}){1,2}$/.test(color);
};

interface ColorSchemeVariant {
    // The background color of the color scheme in hex format.
    backgroundColor: string;
    // The text color of the color scheme in hex format.
    textColor: string;
}

export interface ParsedColorSchemeConfig {
    // All defined light color schemes.
    light: { [name: string]: ColorSchemeVariant };
    // All defined dark color schemes.
    dark: { [name: string]: ColorSchemeVariant };
}

export function parseColorSchemeConfig(config: string): { result: ParsedColorSchemeConfig; error: string | null } {
    // Let's first get all "possible" sections of the text.
    // We're adding `\n` so the sections "first" word is the
    // name of the color scheme. We could remove this and
    // skip this in the process of parsing, but because
    // the first entry will not have this first '\n' it will
    // be more complicated to otherwise just add this '\n' here.
    const sections = config.split(`${SEPERATOR }\n\n`);

    const definedColorSchemeNames: Set<string> = new Set();
    let lastDefinedColorSchemeName: string | undefined = '';

    const definedColorSchemes: ParsedColorSchemeConfig = {
        light: {},
        dark: {},
    };

    // Define the interrupt and error variables.
    // Interrupt is to indicate that the parsing should stop.
    // But because we cannot break out of a forEach loop,
    // we need to use an interrupt variable.
    // The error is to indicate that there was an error.
    // And also the reason why the parsing failed.
    // It will be the first error that is found.
    let interrupt = false;
    let error: string | null = null;

    const throwError = (message: string) => {
        if (!interrupt) {
            interrupt = true;
            error = message;
        }
    };

    // Now we will iterate troughout each section.
    // We will always assume bad-faith and make sure to have
    // guards in place. As this could also be bad code.
    // We shouldn't rely on that the input is correct.
    sections.forEach((section) => {
        // Check if the interrupt variable is set.
        // If it is, we should stop parsing.
        if (interrupt) {
            return;
        }

        // First we split the section into lines.
        const lines = section.split('\n');

        // We have to make sure that the first line is a valid color scheme name.
        // We will also make sure that the name is not already defined.
        const name = lines[0];
        if (!name) {
            throwError('No color scheme name was found.');
            return;
        }
        if (definedColorSchemeNames.has(name)) {
            throwError(`The color scheme name "${name}" is already defined.`);
            return;
        }
        // Check if the name is on alphabetical order.
        if (lastDefinedColorSchemeName && lastDefinedColorSchemeName !== 'Default' && name.localeCompare(lastDefinedColorSchemeName) < 0) {
            throwError(`The color scheme name "${name}" is not in alphabetical order.`);
            return;
        }
        lastDefinedColorSchemeName = name;

        // Add the name to the set of defined color scheme names.
        definedColorSchemeNames.add(name);

        // Check if line[1] is empty, which is must be.
        if (lines[1]) {
            throwError(`The second line of the color scheme "${name}" is not empty.`);
            return;
        }

        const checkVariant = (lineIndex: number, isSecondVariant: boolean): (ColorSchemeVariant & { variant?: string }) | undefined => {
            // Get the possible variant name.
            const variant = lines[lineIndex];
            if (!variant) {
                throwError(`The third line of the color scheme "${name}" is not defined.`);
                return;
            }

            // Check if the variant is valid.
            // if isSecondVariant is true, then we will check if the variant is 'Light', 'Dark' is not considered valid.
            if (variant !== 'LIGHT' && variant !== 'DARK' && (isSecondVariant && variant === 'Light')) {
                throwError(`The ${humanizeNumber(lineIndex)} line of the color scheme "${name}" is not a valid variant.`);
                return;
            }

            // Get the possible background color.
            const firstProperty = lines[lineIndex + 1];
            if (!firstProperty) {
                throwError(`The ${humanizeNumber(lineIndex + 1)} line of the color scheme "${name}" is not defined.`);
                return;
            }

            // Check if the property is background color.
            if (!firstProperty.startsWith('background: ')) {
                throwError(`The ${humanizeNumber(lineIndex + 1)} line of the color scheme "${name}" is not background-color property.`);
                return;
            }

            // Get the background color and check if it is a valid hex color.
            const backgroundColor = firstProperty.slice(backgroundPropertyLength);
            if (!isValidHexColor(backgroundColor)) {
                throwError(`The ${humanizeNumber(lineIndex + 1)} line of the color scheme "${name}" is not a valid hex color.`);
                return;
            }

            // Get the possible text color.
            const secondProperty = lines[lineIndex + 2];
            if (!secondProperty) {
                throwError(`The ${humanizeNumber(lineIndex + 2)} line of the color scheme "${name}" is not defined.`);
                return;
            }
            // Check if the property is text color.
            if (!secondProperty.startsWith('text: ')) {
                throwError(`The ${humanizeNumber(lineIndex + 2)} line of the color scheme "${name}" is not text-color property.`);
                return;
            }
            // Get the text color and check if it is a valid hex color.
            const textColor = secondProperty.slice(textPropertyLength);
            if (!isValidHexColor(textColor)) {
                throwError(`The ${humanizeNumber(lineIndex + 2)} line of the color scheme "${name}" is not a valid hex color.`);
                return;
            }
            // If the variant is the second variant, then we will return the variant and the variant name.
            return {
                backgroundColor,
                textColor,
                variant,
            };
        };

        const firstVariant = checkVariant(2, false)!;
        const isFirstVariantLight = firstVariant.variant === 'LIGHT';
        delete firstVariant.variant;
        // If the interrupt variable is set, we should stop parsing.
        if (interrupt) {
            return;
        }
        let secondVariant: typeof firstVariant | null = null;
        let isSecondVariantLight = false;
        // Check if the 7th line is defined otherwise we should stop parsing.
        if (lines[6]) {
            secondVariant = checkVariant(6, true)!;
            isSecondVariantLight = secondVariant.variant === 'LIGHT';
            delete secondVariant.variant;
            // If the interrupt variable is set, we should stop parsing.
            if (interrupt) {
                return;
            }
            // Must end with 1 new line(two Variants).
            if (lines.length > 11 || lines[9] || lines[10]) {
                throwError(`The color scheme "${name}" doesn't end with 1 new line.`);
                return;
            }
        } else if (lines.length > 7) {
            throwError(`The color scheme "${name}" doesn't end with 1 new line.`);
            return;
        }
        if (secondVariant) {
            if (isFirstVariantLight === isSecondVariantLight) {
                throwError(`The color scheme "${name}" has the same variant twice.`);
                return;
            }
            if (isFirstVariantLight) {
                definedColorSchemes.light[name] = firstVariant;
                definedColorSchemes.dark[name] = secondVariant;
            } else {
                definedColorSchemes.light[name] = secondVariant;
                definedColorSchemes.dark[name] = firstVariant;
            }
        } else if (isFirstVariantLight) {
            definedColorSchemes.light[name] = firstVariant;
        } else {
            definedColorSchemes.dark[name] = firstVariant;
        }
    });

    return {result: definedColorSchemes, error: error};
}
