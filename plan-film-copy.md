# Film page copy (Danny's write-ups)

Source: the "Video Write Ups-" Google Doc, as Danny left it on 2026-09-16 after
answering the review comments. Goal: replace the one-line summaries on the eight
`layouts/film.njk` pages with the real write-ups, and retitle the pages.

## Decisions (from Danny's replies)

- **Titles change, names and URLs don't.** "Page titles should change" only.
  Joscelyn Dempsey stays; slugs stay (the Magic URL question went unanswered, so
  no redirects needed yet).
- Titles must stand alone in `<title>`, so the client is kept in the title where
  the doc heading alone wouldn't identify the work (Block Strong, Magic).
- Keep "then Florida Hospital" on Dasah's Day, Brain Divided and Orthopedics.
- Block Strong keeps "We still don't know the answer." Adds the missing "in".
- ADDY credit belongs to Dasah's Day (Best in Film, runner-up Best in Show,
  2016), not Brain Divided.
- AV Summit client becomes Orlando Economic Partnership; "Vehicle" singular.
- Encore client becomes "Encore Resort" (Danny's edit).
- Voice is "we" throughout. Em dashes and spaced hyphens become commas/colons.

## Titles

| Page | Old title | New title | Client |
|---|---|---|---|
| go-for-less | Go For Less | Go For Less TV Campaign | Seminole State College |
| a-brain-divided | A Brain Divided | A Brain Divided Testimonial | AdventHealth |
| orlando-magic-jersey-teaser | Orlando Magic Jersey Teaser | Orlando Magic Jersey Partnership Sales | Orlando Magic |
| block-strong | Block Strong | Block Strong TV Commercial | Block Strong |
| adventhealth-dasahs-day | Dasah's Day | Dasah's Day Testimonial | AdventHealth |
| autonomous-vehicle-summit | Autonomous Vehicle Summit Promo | Autonomous Vehicle Summit | Orlando Economic Partnership |
| encore-at-reunion | Resort Amenities with Dan Marino | Dan Marino Spot | Encore Resort |
| adventhealth-orthopedics | Florida Hospital Orthopedics | Orthopedics Patient Story | AdventHealth |

## Per file

1. `film.summary` → the write-up (folded YAML scalar).
2. `title`, breadcrumb name, `description` → match the new title and facts.
3. Magic, AV Summit, Go For Less, Encore: fix `schema.video.description` and the
   image caption, which describe the wrong thing today. `video.name` keeps the
   hosted video's title.
4. `dateModified` → 2026-09-16.
5. `src/work.njk`: the eight card headings take the new titles.

## Verify

`npm run build`, then grep the eight rendered pages for the new `<title>`,
summary text, breadcrumb JSON-LD, and no `—` in authored copy. Check one page in
the browser.

## Open (not blocking)

- Magic URL change: unanswered, left as is.
- Links to the other Seminole State spots and Encore spots: unanswered.

## Status

- Code: not committed yet.
- Deployed: no. Pushing is Albert's call.
