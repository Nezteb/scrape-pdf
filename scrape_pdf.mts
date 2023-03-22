// TODO: "Cannot find module 'playwright' or its corresponding type declarations."
import { chromium } from "playwright";

(async () => {
    try {
        const rootUrl = process.argv.slice(2)[0];
        console.log(`Fetching ${rootUrl}...`);

        const browser = await chromium.launch({
            headless: true
        });

        const page = await browser.newPage();
        await page.goto(rootUrl);

        // https://uibakery.io/regex-library/url
        const urlRegex = /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)/

        // https://stackoverflow.com/a/6041965/7682196
        // const urlRegex = /(http|ftp|https):\/\/([\w_-]+(?:(?:\.[\w_-]+)+))([\w.,@?^=%&:\/~+#-]*[\w@?^=%&\/~+#-])/

        // https://unix.stackexchange.com/a/181258
        // const urlRegex = /(http|https)://[a-zA-Z0-9./?=_%:-]*/
        const r = new RegExp(urlRegex);

        // console.log(body.match(r));
    } catch (e) {
        // ...
    }
})();
