import fs from 'fs';
import type { Browser, Page } from "playwright";

export type UrlMap = {
    [x: string]: boolean
}

const outputDir = "./output";

const visitPage = async (rootUrl: string, browser: Browser, urlMap: UrlMap, url: string) => {
    const page = await browser.newPage();
    await page.goto(url);

    const newUrls = await getCleanUrlsFromPage(rootUrl, urlMap, page);

    // const urlsToLog = ["https://beautifulracket.com/", "https://beautifulracket.com/appendix/glossary.html", "https://beautifulracket.com/appendix/thoughts-on-rhombus.html"]
    // if(urlsToLog.includes(url)) {
    //     console.log(`Found ${newUrls.length} new URLs: ${JSON.stringify(newUrls, null, 2)}`)
    // } else {
    //     console.log(`Found ${newUrls.length} new URLs`)
    // }

    // if(newUrls.length > 0) {
    //     console.log(`Found ${newUrls.length} new URLs: ${JSON.stringify(newUrls, null, 2)}`)
    // }

    await savePdfFile(page, url);

    urlMap[url] = true;
    await page.close();

    newUrls.forEach((url) => {
        urlMap[url] = false;
    });

    return urlMap;
}

const getCleanUrlsFromPage = async (rootUrl: string, urlMap: UrlMap, page: Page) => {
    const hrefs = await page.evaluate(() => {
        const links = document.querySelectorAll("[href]");
        let urls = [];
        for (const link of links) {
            let href = link.getAttribute("href")
            if (href) {
                href = href.split('#')[0];
                urls.push(href);
            }
        }
        return urls;
    })

    // Clean up URLs with inconsistent slashes
    // TODO: Refactor URL parsing and filtering to more easily handle file extensions, external URLs, etc.
    const cleaned_urls = hrefs.map((url: string) => {
        if (!url.startsWith("http")) {
            // console.log("URL is path only, adding root URL");

            if (url.startsWith("/")) {
                url = url.slice(1);
            }
            url = `${rootUrl}${url}`;
        }

        return url;
    })
        .filter((url: string) => {
            // Remove empty URLs
            if (url.trim() === "") {
                // console.log(`Ignoring empty URL`);
                return false;
            }

            // Remove URLs that aren't HTML pages
            const ignoreExtensions = [".jpg", ".jpeg", ".png", ".gif", ".svg", ".css", ".js", ".ico", ".xml", ".json", ".txt", ".md", ".pdf", ".zip"];
            for (const extension of ignoreExtensions) {
                if (url.endsWith(extension)) {
                    // console.log(`Ignoring URL because it's an ignored extension: ${url}`);
                    return false;
                }
            }
            // const validExtensions = [".html", ".htm"];
            // for (const extension of validExtensions) {
            //     if (!url.endsWith(extension)) {
            //         console.log(`Ignoring URL because it's an invalid extension: ${url}`);
            //         return false;
            //     }
            // }

            // Remove URLs that aren't on the same domain
            if (url.startsWith("http") && !url.startsWith(rootUrl)) {
                // console.log(`Ignoring URL because it's not on the same domain as the root: ${url}`);
                return false;
            }

            return true;
        })


    // Remove duplicates
    const urlSet = new Set(cleaned_urls);

    // Remove URLs that we already know about
    for (const url in urlMap) {
        // console.log(`Deleting URL from set because we already know about it: ${url}`)
        urlSet.delete(url);
        // if (urlMap[url]) {
        // }
    }

    return [...urlSet];
}

const savePdfFile = async (page: Page, url: string) => {
    const lastSlashIndex = nthIndexOf(url, "/", 3);
    let safeUrl = url.slice(lastSlashIndex);
    safeUrl = safeUrl.replace(/[^a-zA-Z0-9_]/g, "_");
    safeUrl = safeUrl.replace(/_{2,}/g, "_");

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
    }

    const pdfPath = `${outputDir}/${safeUrl}.pdf`;

    // https://playwright.dev/docs/api/class-page#page-pdf
    await page.emulateMedia({ media: 'screen' });
    const pdfBuffer = await page.pdf({ path: `${pdfPath}` });
    // TODO: Make async
    fs.writeFileSync(pdfPath, pdfBuffer);
    console.log(`Saved PDF: ${pdfPath}`);
}

const nthIndexOf = (string: string, char: string, nth: number, fromIndex: number = 0): number => {
    let indexChar = string.indexOf(char, fromIndex);
    if (indexChar === -1) {
        return -1;
    } else if (nth === 1) {
        return indexChar;
    } else {
        return nthIndexOf(string, char, nth - 1, indexChar + 1);
    }
}

export { visitPage, getCleanUrlsFromPage };