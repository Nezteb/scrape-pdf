# Scape PDF

Make sure you have `pnpm` installed: https://pnpm.io/installation

```sh
pnpm install
pnpm run scrape <url>
```

You'll see some console output, and then should have an `output` directory full of PDF files and a single `___urls.txt` file.

## CLI Options
| Full | Short | Description |
|--|--|--|
| `--dry-run` | `-d` | Perform the web crawl without creating PDFs |
| `--verbose` | `-v` | Adds additional logging |

# TODO

- [X] A `--dry-run` flag that shows which URLs will be downloaded and what each page's filename will be
- [ ] A URL whitelist feature that works with globs/regexes
- [ ] An option to combine all of the resulting PDFs into one
- [X] Asynchronous file download
- [ ] The ability to also download linked ZIP/PDF files (which are currently ignored)
- [ ] Darkmode option VIA [Dark Reader](https://playwright.dev/docs/chrome-extensions) extension
- [ ] Update links in PDFs to refer to other saved files

# Example Output

![](./scrape-pdf-output-demo.gif)