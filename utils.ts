import fs from 'fs/promises';
import path from 'path';
import type { Browser, Page } from "playwright";
import { LimitFunction } from './limiter';
import { ICLIArguments } from './scrape_pdf';

export type UrlSet = Set<string>;
export type ProcessQueue = Record<string, Promise<void>>;

export const OUTPUT_DIR = "./output";

const visitPage = async (rootUrl: string, browser: Browser, url: string, dryRun: boolean) => {
    const page = await browser.newPage();

    await page.goto(url, { waitUntil: 'domcontentloaded' });

    const newUrls = await getCleanUrlsFromPage(rootUrl, page);

    // const urlsToLog = ["https://beautifulracket.com/", "https://beautifulracket.com/appendix/glossary.html", "https://beautifulracket.com/appendix/thoughts-on-rhombus.html"]
    // if(urlsToLog.includes(url)) {
    //     console.log(`Found ${newUrls.length} new URLs: ${JSON.stringify(newUrls, null, 2)}`)
    // } else {
    //     console.log(`Found ${newUrls.length} new URLs`)
    // }

    // if(newUrls.length > 0) {
    //     console.log(`Found ${newUrls.length} new URLs: ${JSON.stringify(newUrls, null, 2)}`)
    // }

    if (!dryRun) {
        await savePdfFile(page, url);
    }

    await page.close();

    // Remove duplicates
    return new Set(newUrls).keys();
}

const IGNORE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".svg", ".css", ".js", ".ico", ".xml", ".json", ".txt", ".md", ".pdf", ".zip"];
const getCleanUrlsFromPage = async (rootUrl: string, page: Page) => {
    const allHrefElements = await page.locator('[href]').all();
    const hrefs: string[] = [];
    await Promise.all(
        allHrefElements.map(async locator => {
            const href = await locator.getAttribute('href');
            href && hrefs.push(href.split('#')[0]);
        })
    );

    // Clean up URLs with inconsistent slashes
    // TODO: Refactor URL parsing and filtering to more easily handle file extensions, external URLs, etc.
    const baseUrl = new URL(rootUrl).origin;
    return hrefs.reduce((acc: string[], href) => {
        let url: string;
        if (href.startsWith("/")) {
            url = new URL(href.trim(), baseUrl).href
        } else if (href.startsWith("http")) {
            url = href.trim();
        } else {
            return acc;
        }

        // Remove empty URLs
        if (url === "" || url === "/") {
            return acc;
        }

        // Remove URLs that aren't HTML pages
        if (IGNORE_EXTENSIONS.includes(path.extname(url))) {
            return acc;
        }
        // const validExtensions = [".html", ".htm"];
        // for (const extension of validExtensions) {
        //     if (!url.endsWith(extension)) {
        //         console.log(`Ignoring URL because it's an invalid extension: ${url}`);
        //         return false;
        //     }
        // }

        // Only include URLs that are on the same domain
        if (!url.startsWith("http") || url.startsWith(rootUrl)) {
            acc.push(url);
        }
        return acc;
    }, []);
}

const savePdfFile = async (page: Page, url: string) => {
    const lastSlashIndex = nthIndexOf(url, "/", 3);
    let safeUrl = url.slice(lastSlashIndex);
    safeUrl = safeUrl.replace(/[^a-zA-Z0-9_]/g, "_");
    safeUrl = safeUrl.replace(/_{2,}/g, "_");

    const pdfPath = `${OUTPUT_DIR}/${safeUrl}.pdf`;

    // https://playwright.dev/docs/api/class-page#page-pdf
    await page.emulateMedia({ media: 'screen' });
    const pdfBuffer = await page.pdf({ path: `${pdfPath}` });
    // TODO: Make async
    await fs.writeFile(pdfPath, pdfBuffer);
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

export const processUrl = async (
    browser: Browser,
    rootUrl: string,
    url: string,
    visitedUrls: UrlSet,
    processQueue: ProcessQueue,
    args: Omit<ICLIArguments, 'rootUrl'>,
    limit: LimitFunction,
) => {
    if (visitedUrls.has(url)) {
        return;
    }
    if (args.verbose) {
        console.log(`Current step ${url}: ${visitedUrls.size} URLs processed, ${Object.keys(processQueue).length} still in process queue`);
    }
    visitedUrls.add(url);
    const newUrls = await visitPage(rootUrl, browser, url, args.dryRun);
    for (const nextUrl of newUrls) {
        if (!visitedUrls.has(nextUrl)) {
            processQueue[nextUrl] = limit(() => processUrl(browser, rootUrl, nextUrl, visitedUrls, processQueue, args, limit));
        }
    };
    
    delete processQueue[url];
};
