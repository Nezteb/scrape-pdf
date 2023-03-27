import { chromium } from "playwright";
import { parse } from "ts-command-line-args";
import { processUrl, ProcessQueue, UrlSet, OUTPUT_DIR } from "./utils";
import { limiter } from './limiter';
import fs from 'fs/promises';

export interface ICLIArguments {
    rootUrl: string;
    dryRun: boolean;
    verbose: boolean;
}

(async () => {
    try {
        const passedArgs = parse<ICLIArguments>({
            rootUrl: {
                type: String,
                defaultOption: true
            },
            dryRun: {
                type: Boolean,
                alias: 'd',
                description: "Navigate through the web graph and print the paths to console without converting the pages to PDFs",
                defaultValue: false,
            },
            verbose: {
                type: Boolean,
                alias: 'v',
                description: "Add more logging",
                defaultValue: false,
            }
        });

        
        const { rootUrl, ...args } = passedArgs;
        console.log(`Root: ${rootUrl}`);
        
        args.dryRun && console.log('-- DRY RUN, NO SAVING PDFS --');

        const browser = await chromium.launch({
            headless: true
        });

        try {
            await fs.stat(OUTPUT_DIR);
        } catch (err) {
            await fs.mkdir(OUTPUT_DIR);
        }

        try {
            const limit = limiter(5);
            const visitedUrls: UrlSet = new Set();
            const processQueue: ProcessQueue = {
                [rootUrl]: limit(() => processUrl(
                    browser,
                    rootUrl,
                    rootUrl,
                    visitedUrls,
                    processQueue,
                    args,
                    limit,
                ))
            };
    
            // Recursively wait for all processes to finish
            const doProcessing = async () => {
                const currentProcesses = Object.values(processQueue);
                if (currentProcesses.length > 0) {
                    await Promise.all(currentProcesses);
                    await doProcessing();
                }
            };
            await doProcessing();
    
            const urls = Array.from(visitedUrls.keys());
            const sortedUrls = urls.sort().join('\n');
            console.log(sortedUrls);
            await fs.writeFile(`${OUTPUT_DIR}/___urls.txt`, sortedUrls);
        } catch (err) {
            console.error(err);
            browser.close();
            throw err;
        }
        if (args.verbose) {
            console.log('CLOSING BROWSER');
        }
        browser.close();
    } catch (e) {
        console.error(e);
    }
})();
