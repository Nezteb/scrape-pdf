// TODO: "Cannot find module 'playwright' or its corresponding type declarations."
import { chromium } from "playwright";
const Crawler = require('crawler');

(async () => {
    try {
        let rootUrl = process.argv.slice(2)[0];
        if (!rootUrl) {
            console.error("Please provide a root URL.");
            return;
        }
        if (rootUrl.endsWith('/')) {
            rootUrl = rootUrl.slice(0, -1);
        }
        console.log(`Root ${rootUrl}`);

        const browser = await chromium.launch({
            headless: true
        });

        const c = new Crawler({
            maxConnections: 10,
            // This will be called for each crawled page
            callback: (error: any, res: any, done: any) => {
                if (error) {
                    console.error(error);
                } else {

                    // const page = await browser.newPage();
                    // await page.goto(rootUrl);

                    // $ is Cheerio by default
                    const $ = res.$;

                    console.log("URL: " + res.request.uri.href);

                    const body = res.body

                    // https://uibakery.io/regex-library/url
                    // const urlRegex = /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)/

                    // https://stackoverflow.com/a/6041965/7682196
                    // const urlRegex = /(http|ftp|https):\/\/([\w_-]+(?:(?:\.[\w_-]+)+))([\w.,@?^=%&:\/~+#-]*[\w@?^=%&\/~+#-])/

                    // https://unix.stackexchange.com/a/181258
                    // const urlRegex = /(http|https)://[a-zA-Z0-9./?=_%:-]*/

                    const urlRegex = new RegExp("href=\"([^#][^\"]*)\"", "g")

                    let urls = [...body.matchAll(urlRegex)]
                        // Clean up URLs with inconsistent slashes
                        .map((match: any) => {
                            let url = match[1]

                            if (url.startsWith('/')) {
                                url = url.slice(1)
                            }

                            url = `${rootUrl}/${url}`

                            return url;
                        })
                        // Remove URLs that aren't HTML pages
                        .filter((url: string) => {
                            const ignoreExtensions = [".jpg", ".jpeg", ".png", ".gif", ".svg", ".css", ".js", ".ico", ".xml", ".json", ".txt", ".md", ".pdf"]
                            for (const extension of ignoreExtensions) {
                                if (url.endsWith(extension)) {
                                    return false;
                                }
                            }
                            return true;
                        })
                    // Remove duplicates
                    urls = [...new Set(urls)];

                    console.log(`URLs: ${JSON.stringify(urls, null, 2)}`);
                }
                done();
            }
        });

        c.queue(rootUrl);

    } catch (e) {
        console.error(e);
    }
})();
