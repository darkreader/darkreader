import {readFile} from '../tasks/utils.js';
import {indexSitesFixesConfig} from '../src/generators/utils/parse.ts';

async function main(){
    const config = await readFile('src/config/dynamic-theme-fixes.config');
    const index = indexSitesFixesConfig<DynamicThemeFix>(config);

}

main().then(() => {console.log('Done')});