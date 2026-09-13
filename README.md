# Personal site

Live at https://markpatel.in. A single static page. No build step, no dependencies — `index.html` is the whole
site. Open it in a browser to preview; push to publish.

## Editing

Everything you need to change is marked in `index.html`:

- `EDIT:` — a line to rewrite in your own words
- `TODO —` — a placeholder that is currently visible on the page

Search for `TODO` and make sure zero matches remain before you send the link to
anyone:

```
grep -c TODO index.html
```

The sections, in the order a recruiter reads them:

| Section | What it is for |
| --- | --- |
| Header | Name, one-line pitch, location, whether you are looking |
| Currently | What you are building *right now*. Keep this fresh — it is the difference between a CV and a signal of life |
| Projects | 3–5 entries. Each needs what it does, the hard decision, and a result |
| Experience | What you owned, not what the team did |
| Stack | Only things you would sit an interview on |
| Contact | Real links. Drop `cv.pdf` in this folder and link it |

## Publishing to GitHub Pages

This folder is named for a **user site**, which lives at
`https://<username>.github.io`. That only works if the repo name exactly matches
your GitHub username — rename the folder if `NotMark-17` is not it.

1. Create an empty public repo on GitHub named `<username>.github.io`
   (no README, no .gitignore — this folder already has the files).
2. From this folder:

   ```
   git remote add origin https://github.com/<username>/<username>.github.io.git
   git branch -M main
   git push -u origin main
   ```

3. Repo → **Settings → Pages** → Source: *Deploy from a branch*, branch `main`,
   folder `/ (root)`. Save.
4. Wait a minute or two, then load `https://<username>.github.io`.

Every later `git push` republishes.

### Custom domain (optional)

Buy a domain, add a `CNAME` file to this folder containing just the domain
(e.g. `markpatel.dev`), point a DNS `CNAME` record at `<username>.github.io`,
then set the domain under Settings → Pages and tick *Enforce HTTPS*.
