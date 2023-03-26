import { chromium } from "playwright";
import { visitPage } from "./utils";
import fs from 'fs';
import type { UrlMap } from "./utils";

const outputDir = "./output";

(async () => {
    try {
        let rootUrl = process.argv.slice(2)[0];
        if (!rootUrl) {
            console.error("Please provide a root URL.");
            return;
        }
        if (!rootUrl.endsWith("/")) {
            rootUrl += "/";
        }
        console.log(`Root: ${rootUrl}`);

        const browser = await chromium.launch({
            headless: true
        });

        let urlMap: UrlMap = {
            [rootUrl]: false
        };

        do {
            for (const url in urlMap) {
                if (!urlMap[url]) {
                    console.log(`Visiting: ${url}`);
                    urlMap = await visitPage(rootUrl, browser, urlMap, url);

                    const visitedCount = Object.values(urlMap).filter((visited) => visited).length;
                    const totalCount = Object.values(urlMap).length;

                    console.log(`Visited: ${visitedCount} / ${totalCount}`);
                } else {
                    // console.log(`Skipping visited URL: ${url}`);
                }
            }
        } while(Object.values(urlMap).includes(false));

        const urls = Object.keys(urlMap);
        const urls_string = JSON.stringify(urls, null, 2);
        console.log(`URLs: ${urls_string}`);
        fs.writeFileSync(`${outputDir}/___urls.txt`, urls_string);

        await browser.close();
    } catch (e) {
        console.error(e);
    }
})();

