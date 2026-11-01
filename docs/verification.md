# Edition 2 verification

Reviewed on 2026-11-01. Local implementation only; nothing was deployed.

## Release content

The atlas contains **450 concepts, 824 relationships, 533 source records, 283 representative formulas/definitions, 47 pillars, and six journeys with 71 narrated stops**. There are 12 major sections and 43 populated subbranches. The expansion adds 190 complete entries; all original concept IDs and tour stops remain valid.

| Section | Concepts |
| --- | ---: |
| Mathematics | 71 |
| Methods & instruments | 15 |
| Computing | 50 |
| Engineering | 18 |
| Physics | 62 |
| Astronomy | 37 |
| Earth & environment | 36 |
| Chemistry | 37 |
| Materials science | 12 |
| Life sciences | 51 |
| Medicine | 25 |
| Mind & society | 36 |

Existing entries were explicitly classified rather than assigned from free-form tags. Five health entries moved to medicine; the ecosystem entry moved from Earth science to life science. Their IDs and prior representations were preserved.

## Automated verification

`npm test` passes all **23 tests**. `npm run build` passes content validation, TypeScript checking, and the Vite production build without chunk-size warnings. The committed npm lockfile matches version 2.0.0.

Validation checks required content, contributor roles, citations, representation citations, unique IDs, branch/discipline consistency, related branches, date precision notes, valid endpoints, duplicate relationships, chronological contradictions, cycles, tour references, release coverage, and node overlaps.

Tests cover:

- Multi-parent ancestry, unique descendant counts, pillar eligibility and sorting, and six complete tours.
- Combined branch, discipline, era, standing, and relationship filters; filtered ancestors retained as context; empty results.
- Search aliases, contributors and diacritics; legacy hashes and new branch/connection/display state; invalid state normalization.
- Deterministic placement independent of input order, shared period boundaries, chronological floor order, centered era bounds and branch cells, section containment, and correct era identification near floor boundaries.
- A synthetic crowded period that expands horizontally without wrapping; nearby unequal dates in different branches retain separate horizontal regions.
- Distinct bundle membership separated by type/evidence, filtered counts, individual-edge exclusion, stable representative routes, and unchanged graph statistics.
- All **824 individual routes** avoid unrelated cards. Dense synthetic cases cover many parents, same-floor links, long links, changing era widths, deterministic routing, and fanned ports. Rounded corners remain inside the tested clearance margins.

## Production browser review

Reviewed in the Chromium-based in-app browser with the complete dataset at **1440 × 960**, **820 × 900**, and **390 × 844**.

- Stepped through all 71 stops of all six journeys and reached every completion control.
- Opened old concept links and new branch/filter/formula/connection links; verified Back/Forward restoration.
- Confirmed physics/fields-only ancestry for general relativity retains mathematical concepts as context.
- Checked empty search, combined-filter empty states, recovery, and the 450-entry chronological index.
- Opened a new entry from the index using Enter and expanded nested branch navigation using the keyboard.
- Navigated between branches and eras, checked shared-floor separation, the sticky ruler, full-tower era markers, and the section minimap.
- Opened a counted bundle using Enter: its displayed count matched all eight cited member relationships. Expanding a bundle revealed its individual routes and closed the panel.
- Checked Bundled, Focus only, and All connections; selected paths remain prominent while unrelated connections fade.
- Reviewed mobile navigation, the full-screen formula sheet, tracing and reopening details, touch controls, and no document-level horizontal overflow.
- Reviewed the tablet split layout and wrapped toolbar controls; both index and detail content remained accessible.
- Verified Words/Formulas switching, explanatory symbol text, source links, and stable positions. Corrected a missing population-symbol explanation in the SIR example during review.
- The final production browser reported no warnings or errors.

Reduced-motion preferences are honored by CSS and viewport animation controls. Focus styles and equivalent index/detail navigation remain available. This is a manual accessibility review, not a comprehensive screen-reader or WCAG certification.

## Editorial review and limitations

New entries and edges were researched against original publications, scholarly histories, institutional accounts, and technical references. Reviews covered cross-branch edges, affected pillars, independent discovery, historical dating, contributors, and frontier status. Two weak analogy/application links were removed because they did not justify developmental parenthood. Mathematical and physical reformulations are distinguished from earlier historical milestones.

Examples of explicit qualifications include Shannon's 1949 sampling treatment and named antecedents, the 1910 publication of elastic rebound after the 1906 earthquake, the specific 1937 citric-acid-cycle milestone, the edited posthumous origins of Saussure's Course, and MOND's speculative standing. Miasma remains prominently superseded; useful approximations retain their stated domains.

Some publisher references expose abstracts or bibliographic records rather than full text. This is a curated introductory synthesis with source review, not independent specialist peer review. Automated tests establish structural integrity and rendering behavior, not the truth of every historical claim or future availability of external URLs.

## Preview images

![Desktop branch floors and bundled connections](preview-desktop.png)

![A cited bundle with its member relationships](preview-bundles.png)

![Full tower with growing sections and era markers](preview-overview.png)

![Mobile medicine formula sheet](preview-mobile.png)
