# markpatel.in

Mark Patel's portfolio. Static site on GitHub Pages (this repo, branch `main`, root). `.nojekyll` is set, so every file here is served publicly, this one included. Pushing to `main` goes live in about 30 seconds.

Custom domain via `CNAME` (DNS at GoDaddy). The Google Search Console verification TXT record lives in DNS; never remove it.

## Layout

- `index.html`: the portfolio. Vanilla HTML/CSS/JS in one file, Lenis smooth scroll, editorial look (light grey `#ECECEC`, black `#1E1E1E`, tiny labels, huge type, tilted stacked image plates).
  - Theme toggle is stored in localStorage `mp-theme`. Recruiter mode (`?mode=recruiter`, R key) is stored in `mp-mode`, and both are applied in a head script before paint.
  - GoatCounter analytics (`markpatel.goatcounter.com`) with a `?r=` per-person tag.
  - Performance rules (Mark reported lag twice): no mix-blend-mode, no animated filters, no animated masks, no per-frame canvas redraws of thousands of shapes, no always-on rAF loops. Theme toggle = one `.paint` circle (<=1200px, scaled with a WAAPI transform animation), theme swapped under it, then faded. HUD/logo colour over #contact = 1px IntersectionObserver lines (`hud-dark`, `logo-b-dark`, `logo-s-dark`). Work-stage skew runs only while scrolling and only when #work is on screen. About `.statement`: letters split lazily on first hover; each has a pre-stroked twin (`.mg-b`) whose opacity rises near the cursor (`font-kerning: none` so splitting doesn't shift text). Oracle `.cert`: tilt via --rx/--ry, `.foil`/`.glare` under the text, visible only while hovered, translate-only. Measure with a CDP trace before/after any new effect.
  - Effects live in the `fx` script near the end and the "designed plates" / "scroll warp + particle headline" CSS: work plates are CSS objects sized in container units (`cqw`); the contact headline is redrawn as canvas dots that scatter from the cursor; nav/index/panel names decode through glyphs; plates skew and RGB-split with scroll speed (desktop only); the HUD and logo turn dark over #contact (see Performance rules). All of it is off under prefers-reduced-motion. Keep plate content factual (no invented numbers or outputs).
- Hero (`.hero`, first screen, desktop and mobile): Mark's photo `mark.webp` (colour cut-out made locally with Apple Vision, cropped at the chest; he rejected black and white) with a giant "Mark Patel —" strip sliding behind him (WAAPI loop, scroll changes its speed/direction via `updatePlaybackRate`, paused off screen). Inspired by dennissnellenberg.com. If you replace the image, bump `?v=`.
- `404.html`, `og-image.png` (link preview), `favicon.png`, `apple-touch-icon.png`, `robots.txt`, `sitemap.xml`.
- `uniexplore/`: UniExplore, a no-login admissions tool (see below). The portfolio's UniExplore card opens it through a cross-document view transition (`view-transition-name: ue-hero`).
- `uniexplore-landing.jpg`: the plate image for that card, a 16:10 screenshot of the live app. If you change the image, bump the `?v=` in `index.html`.
- `demos/`: spec websites pitched to local businesses. Each has a "demo, not affiliated" banner and `noindex`, and `/demos/` is disallowed in robots.txt. Leave them alone unless asked.

## UniExplore

- The chance model (constants, `chance`, `evaluate`, `costFor` and helpers) lives in `uniexplore/model.js`, exposed as `window.UEM`. It is loaded after `data.js` by the app. Edit the model there. The app imports each name with `var x = UEM.x` at the top of its script.
- Layout (kept deliberately simple, Mark asked for less on one page): a compact hero; the profile shows only "The basics" (board, Class 12, Class 9-11, stream, major, countries) with Tests, Beyond marks, and Budget and timing folded into `<details class="more">` sections that show a one-line summary (`sums()`); results are a slim summary (strength ring + counts) and three tabs: Your list (default), Improve (strength bars + moves, badge = number of moves), Timeline (roadmap). Trying a move or tapping the jump pill switches to Your list first so the cards can be seen moving. Don't add new always-visible sections; fold or tab them.
- `uniexplore/index.html` holds the app UI. Inputs:
  - board: CBSE, ISC, State, IB, A-Level or US GPA
  - predicted Class 12 score
  - final Class 9, 10 and 11 marks
  - stream, SAT/ACT, AP (optional), English test, activity levels, major, countries, budget, need for aid, intake
- Chance model: logistic, starting from the university's acceptance rate. Every weight below is a named model heuristic in the code, not university data.
  - Marks: a weighted blend of Class 9–12 that varies by country (`YEAR_W`). The US weighs 11th most. A predicted 12th far above the 11th (or the weakest earlier year if 11th is blank) is discounted (`PRED_DISCOUNT`, milder in the US). A blank year never counts for more than your weakest reported year. Scores are clamped to the board's range. State boards get a token -2 (`STATE_ADJ`) and a drawer note. The US "rising marks" bonus compares 11th with the earlier average and is kept monotone.
  - Bar: `indiaReq` (or `ibReq` for IB, converted by the same IB formula). Competitive majors (`COMPETITIVE`) aim halfway to the "high" bar; a subject named in the school's `strengths` adds the other half (`FLAGSHIP_W`). A per-course figure in `indiaReq.byMajor` (`byMajorISC` for ISC) wins over the blend. US bars come from `gpaAvg`, or from a line fitted at load (`US_FIT`), but those are admitted-student means, so the bar sits `ADMIT_MEAN.drop` × admit rate below them and the slope flattens as the admit rate rises. A bar is never above the board's maximum score.
  - No acceptance rate: selectivity is implied from `indiaReq.typical`, interpolated from `BASE` up to the schools with a real rate (Oxford, Cambridge). It is never shown as an admit rate. `BASE` alone applies when there is no bar.
  - Ceiling: p ≤ 1 − (1 − ar)^3.2 (`CEIL_K`), so nothing under about 30% admit reads as safe. Where the data gives `intlAdmitRate` (Cambridge India-domiciled, Cornell nonresident), the ceiling uses it.
  - SAT: ignored at test-blind schools. Test-optional: a score never costs more than not sending it, and "Don't send your SAT" shows only below `satMid50[0]`. No published `satMid50`: a score is neutral ("SAT not compared") and so is not sending one, but a required test that's missing still counts.
  - English: below a published minimum it's a hard requirement (z penalty and the chance is capped as a reach). A missing test is a small penalty.
  - Activities: about average is neutral, and a blank section is only mildly negative (`ACT_W`).
  - Hard gates cap a chance at 5% (`GATE_CAP`) and tag the card: `indiaReqMin` (checked against the Class 12 score itself), a required SAT/ACT that's missing, a stream without Class 12 Maths (CS, engineering, sciences) or Biology (health), a board missing from `boards`, and Cambridge's `cbseRule` (CBSE needs 5+ APs outside arts/humanities).
  - Never safe (capped at 67%): health majors (entrance tests and interviews; "No medicine listed" when the data shows none), and schools with neither an admit rate nor a bar ("No published bar", marked ~).
  - Cost uses `tuitionByMajor` and `collegeFee` where the data has them, and is compared with the budget after rounding to whole lakh. With need-aid on, `aidPolicy: need-blind-full` schools read "Aid may cover it", missing `intlAid` reads "Aid unknown", and the budget move is hidden.
  - AP (optional: exams taken, count at 4 or 5): a small logit lift from `AP_W`, capped with diminishing returns. It is largest in the US and tiny in the UK, Canada, Singapore and Australia. Scores below 4 neither add nor subtract. The weights are model heuristics, not university policy, so don't add per-university AP numbers. With AP left empty, every chance is identical to the no-AP model.
  - The "Add 2 APs at 4+" move shows only when the US is selected and the next May exam session reports before that intake's applications.
  - Moves are previewed by running the same `doIt` as "Try it" on a copy. The budget move only counts schools back in budget and is listed after the moves that change chances.
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
- Motion lives in the `ue-motion` style block and the motion script at the end of `uniexplore/index.html`. It only reads what `render()` wrote to the page, never the model, and turns off under prefers-reduced-motion. `change()` holds its re-render while a button or card is being pressed, so a click right after typing a mark still lands.
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

- Mark rejected an "Inside UniExplore" dot-chart section on the portfolio (2026-09-25). Don't add data-viz sections to the portfolio homepage.
