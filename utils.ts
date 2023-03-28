import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import type { Browser, Page } from "playwright";
import type { LimitFunction } from "./limiter";
import { ICLIArguments } from './scrape_pdf';

export type UrlSet = Set<string>;
export type ProcessQueue = Record<string, Promise<void>>;

// https://github.com/microsoft/playwright/blob/591e4ea9763bb1a81ecf289cc497292917f506ee/packages/playwright-core/src/server/page.ts#L414
type Media = undefined | null | "screen" | "print";
type ColorScheme = undefined | null | "light" | "dark" | "no-preference"

export const OUTPUT_DIR = "./output";

const visitPage = async (rootUrl: string, browser: Browser, url: string, verbose: boolean, dryRun: boolean, withHeader: boolean, media: string, colorScheme: string) => {
    const page = await browser.newPage();

    // Some websites will load initial content super quick but then take a while on CSS and assets, so lets wait until network idle
    try {
        await page.goto(url, { waitUntil: 'networkidle' });
    } catch (e) {
        console.log(chalk.red(`Error navigating to ${url}:\n${e}`));
        return [];
    }

    const newUrls = await getCleanUrlsFromPage(rootUrl, page);

    if (!dryRun) {
        await savePdfFile(page, url, verbose, withHeader, media, colorScheme);
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

const savePdfFile = async (page: Page, url: string, verbose: boolean, withHeader: boolean, media: string, colorScheme: string) => {
    const lastSlashIndex = nthIndexOf(url, "/", 3);

    let pageTitle = await page.title()
    pageTitle = pageTitle.replace(/[^a-zA-Z0-9_]/g, "_");
    pageTitle = pageTitle.replace(/_{2,}/g, "_");

    let safeUrl = url.slice(lastSlashIndex + 1);
    safeUrl = safeUrl.replace(/[^a-zA-Z0-9_]/g, "_");
    safeUrl = safeUrl.replace(/_{2,}/g, "_");

    const fileName = `${pageTitle}_${safeUrl}.pdf`;

    const pdfPath = `${OUTPUT_DIR}/${fileName}`;

    // https://playwright.dev/docs/api/class-page#page-emulate-media
    await page.emulateMedia({ media: media as Media, colorScheme: colorScheme as ColorScheme });

    // TODO: Headers are kinda broken, figure out CSS and page margin
    const headerTemplate = `
    <span style="font-size: 10px" class="date"></span>
    <span style="font-size: 10px"> | </span>
    <span style="font-size: 10px" class="title"></span>
    `
    const footerTemplate = `
    <span style="font-size: 10px" class="url"></span>
    <span style="font-size: 10px"> | </span>
    <span style="font-size: 10px" class="pageNumber"></span>
    <span style="font-size: 10px">/</span>
    <span style="font-size: 10px" class="totalPages"></span>
    `

    // https://playwright.dev/docs/api/class-page#page-pdf
    try {
        await page.pdf({ path: `${pdfPath}`, displayHeaderFooter: withHeader, headerTemplate, footerTemplate});
        if(verbose) {
            console.log(chalk.cyan(`PDF: ${pdfPath}`));
        }
    } catch (e) {
        console.log(chalk.red(`Error saving PDF: ${pdfPath}\n${e}`));
    }
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
        console.log(chalk.green(`URL: ${url}`), chalk.cyan(`(visited: ${visitedUrls.size}, remaining: ${Object.keys(processQueue).length})`));
    } else {
        console.log(chalk.green(`URL: ${url}`));
    }
    visitedUrls.add(url);
    const newUrls = await visitPage(rootUrl, browser, url, args.verbose, args.dryRun, args.withHeader, args.media, args.colorScheme);
    for (const nextUrl of newUrls) {
        if (!visitedUrls.has(nextUrl)) {
            processQueue[nextUrl] = limit(() => processUrl(browser, rootUrl, nextUrl, visitedUrls, processQueue, args, limit));
        }
    };
    
    delete processQueue[url];
};
