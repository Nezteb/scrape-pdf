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
| `--media` | `-m` | What media type you want to generate PDFs with, if the site supports different media types ("screen" or "print" (default)) |
| `--colorScheme` | `-c` | What color scheme you want to generate PDFs with, if the site supports color schemes ("light", "dark", "no-preference" (default)) |
| `--withHeader` | `-h` | Whether or not you want PDFs with generated headers (and footers) (default false) |
| `--dryRun` | `-d` | Perform the web crawl without creating PDFs (default false) |
| `--verbose` | `-v` | Adds additional logging (default false) |

# TODO

- [X] A `--dry-run` flag that shows which URLs will be downloaded and what each page's filename will be
- [X] Asynchronous file download
- [ ] Figure out how to actually import and use ESM packages with `ts-node` like `p-limit` and `chalk` v5... `¯\_(ツ)_/¯`
- [ ] EPUB generation option
  - https://github.com/danburzo/percollate
  - https://github.com/alexadam/save-as-ebook
  - https://pandoc.org/
    - https://github.com/valexandersaulys/pandoc-wrapper
- [ ] A URL whitelist feature that works with globs/regexes
- [ ] An option to combine all of the resulting PDFs into one
- [ ] The ability to also download linked ZIP/PDF files (which are currently ignored)
- [ ] Darkmode option VIA [Dark Reader](https://playwright.dev/docs/chrome-extensions) extension
- [ ] Update links in PDFs to refer to other saved files
