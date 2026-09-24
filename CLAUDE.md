# markpatel.in

Mark Patel's portfolio. Static site on GitHub Pages (this repo, branch `main`, root). `.nojekyll` is set, so every file here is served publicly, this one included. Pushing to `main` goes live in about 30 seconds.

Custom domain via `CNAME` (DNS at GoDaddy). The Google Search Console verification TXT record lives in DNS; never remove it.

## Layout

- `index.html`: the portfolio. Vanilla HTML/CSS/JS in one file, Lenis smooth scroll, editorial look (light grey `#ECECEC`, black `#1E1E1E`, tiny labels, huge type, tilted stacked image plates).
  - Theme toggle is stored in localStorage `mp-theme`. Recruiter mode (`?mode=recruiter`, R key) is stored in `mp-mode`, and both are applied in a head script before paint.
  - GoatCounter analytics (`markpatel.goatcounter.com`) with a `?r=` per-person tag.
- `404.html`, `og-image.png` (link preview), `favicon.png`, `apple-touch-icon.png`, `robots.txt`, `sitemap.xml`.
- `uniexplore/`: UniExplore, a no-login admissions tool (see below). The portfolio's UniExplore card opens it through a cross-document view transition (`view-transition-name: ue-hero`).
- `uniexplore-landing.jpg`: the plate image for that card, a 16:10 screenshot of the live app. If you change the image, bump the `?v=` in `index.html`.
- `demos/`: spec websites pitched to local businesses. Each has a "demo, not affiliated" banner and `noindex`, and `/demos/` is disallowed in robots.txt. Leave them alone unless asked.

## UniExplore

- `uniexplore/index.html` holds the whole app. Inputs:
  - board: CBSE, ISC, State, IB, A-Level or US GPA
  - predicted Class 12 score
  - final Class 9, 10 and 11 marks
  - stream, SAT/ACT, English test, activity levels, major, countries, budget, need for aid, intake
- Chance model: logistic, starting from the university's acceptance rate.
  - Marks: a weighted blend of Class 9–12 that varies by country (`YEAR_W`). The US weighs 11th most. Outside the US, a predicted 12th far above the 11th is discounted.
  - SAT: ignored at test-blind schools. At test-optional schools a low SAT is capped and flagged "Don't send your SAT".
  - `indiaReqMin` is a hard minimum for Indian boards.
- Missing earlier-year marks for the chosen countries (`missingYears`) mark every chance as rough (~) and replace "Moves" with an add-your-marks prompt. Editing the example profile clears its made-up earlier marks.
- Data: `uniexplore/data.js` is generated. Do not hand-edit it. Edit the JSON in `uniexplore/source/` and run:

  ```
  python3 uniexplore/source/merge.py
  ```

  - Base data: `data-us.json`, `data-uk.json`, `data-intl.json`, `data-dream.json`.
  - Patches: `data-patch*.json`, keyed by id, short name or name fragment. Their `sources` are appended and `patchNote` goes into the note.
  - Every value comes from an official page or a Common Data Set, with source URLs. Don't invent numbers; leave a field empty and the app shows "n/a".
- Known data gaps:
  - Tuition for King's College London, UCL, Edinburgh, Monash, Adelaide, Macquarie and Melbourne.
  - IELTS minimums for several UK universities.
- Mark's real outcomes: he applied to 18 universities (the `MARK.applied` list) and was admitted to Penn State and the University of Sydney. He got into Penn State with a low SAT. Ask him before adding any other results.
- Test it by running `python3 -m http.server` at the repo root and opening `/uniexplore/`. Check that all 53 cards render and the console shows no errors.

## Content rules (from Mark)

- Contact on the site: email and LinkedIn only. No GitHub link, and never his phone number.
- Don't add personal side projects he hasn't already put on the site.
- Never claim he knows JavaScript (he knows Python, SQL and HTML, and is learning C), and never claim research or authorship.
- May Foundation is closed: past tense, never linked.
- Never show the old hosted UniExplore link (the hackathon version). Only the rebuilt `/uniexplore/`.
- No "open to / accepting internships" status copy. Factual work history is fine.
- Copy tone: confident, witty, recruiter-safe. In anything written as Mark (essays, bios), no em dashes.

## Working with Mark

Build the real thing instead of writing plans or design docs. Keep replies short. Give one or two specific, opinionated ideas tied to his own material, not a generic checklist. Preview changes before pushing, then confirm they're live.
