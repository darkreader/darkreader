import {writeFile, readdir} from 'node:fs/promises';

/**
 * Gets all download URL
 * @returns Object which is a map (version string to download URL)
 */
async function getAllMozillaAddonsStoreVersions() {
    let url = 'https://addons.mozilla.org/api/v5/addons/addon/darkreader/versions/?page_size=200';
    const retVal = {};
    while (url) {
        const {next, results} = (await (await fetch(url)).json());
        url = next;
        for (const {version, file: {url}} of results) {
            retVal[version] = url;
        }
    }
    return retVal;
}

async function getAlreadyPresentVersions() {
    return readdir('./integrity/mozilla');
}

function filterVersions(versions, alreadyPresent) {
    const desired = {};
    for (const version in versions) {
        if (!alreadyPresent.includes(version)) {
            desired[version] = versions[version];
        }
    }
    return desired;
}

async function main() {
    const alreadyPresent = await getAlreadyPresentVersions();
    const allVersions = await getAllMozillaAddonsStoreVersions();
    const versions = filterVersions(allVersions, alreadyPresent);
    const count = Object.keys(versions).length;
    console.log(`Number of discovered new versions: ${count}`);
    let done = 0;
    for (const version in versions) {
        const url = versions[version];
        console.log(`Fetching ${version}`);
        const data = await fetch(url);
        console.log(`Writing ${version}`);
        await writeFile(`firefox/${version}.xpi`, data.body);
        done++;
        console.log(`Done ${done} of ${count}`);
    }
}

main();
