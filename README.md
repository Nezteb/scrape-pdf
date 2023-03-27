# Scape PDF

Make sure you have `pnpm` installed: https://pnpm.io/installation

```sh
pnpm install
pnpm run scrape_pdf <url>
```

You'll see some console output, and then should have an `output` directory full of PDF files and a single `___urls.txt` file.

# TODO

- [ ] A `--dry-run` flag that shows which URLs will be downloaded and what each page's filename will be
- [ ] A URL whitelist feature that works with globs/regexes
- [ ] An option to combine all of the resulting PDFs into one
- [ ] The ability to also download linked ZIP/PDF files (which are currently ignored)

# Example Output

![](./scrape-pdf-output-demo.gif)