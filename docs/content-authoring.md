# Content authoring

The source of truth is the JSON in `src/data/`. Edit it directly. There is no runtime content generator, network-dependent content feed, or public editor.

## Add a concept

Choose the most appropriate collection: `foundations.json`, `physical.json`, `life-earth.json`, `space-computing.json`, or one of the three `expansion-*.json` collections. Add a unique kebab-case ID that will remain stable if the title changes. The complete interface is `Concept` in `src/types.ts`.

Required fields are title, aliases, primary discipline, primary `branchId`, tags, kind, date, summary, problem, development, limitations, standing, contributors, source IDs, and separate citation lists for the summary and history. Contributors must include a role. Credit an unnamed community when evidence does not identify individuals; do not invent a first discoverer.

Choose an explicit primary branch from `branches.json`; its parent must match the primary discipline. Optional `relatedBranchIds` express interdisciplinary associations without duplicating the node. The taxonomy is retrospective navigation, not a claim about historical disciplinary boundaries. Add a `historicalSetting` when a separate description of place, institution, or intellectual context helps; avoid repeating it verbatim in `development`.

Use a negative integer for BCE and a positive integer for CE; there is no year zero. The year is a sorting anchor, while the visible label can represent an approximate period. Explain any approximate date, disputed priority, publication delay, or distinction between first proposal and later evidence in `date.note`. Do not equate the first surviving record with the first human use.

Standings are `established`, `limited`, `superseded`, `open`, and `speculative`. Mathematical open conjectures and empirical frontier proposals need context in the limitations field; a status alone cannot express the full distinction.

An example or a representative formula/definition is optional. Keep prose original, plain, specific, and proportionate to the sources. Link a focused chapter, paper, or historical account, not an institution’s generic home page.

To support **Formulas & definitions** mode, add a `representation` object with `kind` (`formula` or `definition`), a concise `expression`, an `explanation` defining symbols and assumptions, and supporting `sourceIds`. The interface is `Representation` in `src/types.ts`. Use Unicode notation; `_{indices}` and `^{powers}` are also rendered as subscripts and superscripts. Do not put HTML in expressions.

Choose a representative relationship, definition, or example rather than implying a short formula exhausts a theory. State limits such as equilibrium, an ideal gas, constant mass, or a finite equiprobable sample space. Modern notation is explicitly labeled in the interface and does not change the concept’s historical date. Concepts without a suitable representation retain their prose in both modes.

## Add a source

Add a `Source` with a globally unique ID, accurate title, publisher, and usable HTTP(S) URL. Prefer a DOI or stable institution URL where possible. IDs may be referenced by several concepts when the source actually supports their claims. Reference the correct source beside the introduction and historical account; do not merely attach a bibliography unrelated to the prose.

## Add a relationship

The direction is predecessor → later development. Each relationship needs a unique ID, source/target concept IDs, a type, a concrete explanation, an evidence classification, and source IDs.

| Type | Meaning |
| --- | --- |
| `influence` | An earlier idea shaped a later development. |
| `foundation` | A mathematical or formal prerequisite supports the later concept. |
| `enables` | A method, instrument, or discovery made a later development possible. |
| `revision` | A later framework modifies, extends, or replaces aspects of an earlier one. |

Evidence is `documented`, `conceptual`, or `contested`. Conceptual links must explain the inferred dependency without claiming documented transmission. Contested links do not contribute to direct pillar counts. A pillar requires five distinct supported outgoing neighbors; total descendants count reachable concepts once, including all represented relationship types.

Avoid self-links, duplicate pairs, cycles, or backward dates. When a later mathematical foundation describes an earlier theory’s reformulation, create a distinct reformulation entry rather than implying the mathematics preceded the original theory. Independent roots are permitted and often necessary.

## Edit a tour

`tours.json` contains six tours with 8–12 stops each. Every stop references an existing concept and supplies substantive narration. Explain branch changes; two consecutive stops need not have an edge, and tour order must not be presented as proof of derivation.

## Maintain the Chinese edition

English entries remain authoritative for structure and evidence. Add or update their matching text overlays in `src/data/zh-CN/<collection>.json`; concepts and relationships are keyed by stable ID. `tours.json` uses the same journey IDs, with narration aligned to the original step order. Translate titles, aliases, tags, prose, contributor names and roles, date notes, and representation explanations. Keep contributor and alias arrays aligned. Optional fields must match the English entry. Do not add source records, graph endpoints, dates used for ordering, statuses, or other structural fields to overlays.

Keep original bibliographic records unchanged. Contributor names are displayed alongside the original name automatically, so do not append it in the overlay. Use `chineseDateLabel` in `src/i18n/dates.ts` for visible date labels; add an explicitly reviewed format there when a new authored date is introduced. Sorting years remain in the English entry.

Translate prose definitions in `representation.expression`. Mathematical formulas remain canonical; reviewed word-only substitutions belong in `src/i18n/formulas.ts`. Its `symbolicDefinitions` set lists definition entries that contain mathematical or formal-language notation only and must retain that notation. Do not translate symbols, function names, or operators as ordinary words.

Every translated concept, relationship, and journey records a `sourceDigest`: SHA-256 of `JSON.stringify` on its complete English entry. After reviewing and updating a translation, obtain the digest with `sourceDigest(entry)` from `src/i18n/validate.ts` and record it in that overlay. Do not refresh digests in bulk without reviewing the corresponding source changes. The validator reports missing IDs, stale sources, incorrect dates, misaligned arrays, missing definition text, and invalid overlay fields.

Interface messages live in `src/i18n/en.json` and `zh-CN.json`, with typed message keys and matching `{placeholder}` names. Use whole messages for counts rather than joining translated fragments. Taxonomy labels live in `src/i18n/taxonomy.ts`; branch IDs, colors, and ordering stay canonical.

Review revised scientific wording against the English source, including uncertainty and historical qualifications. The initial Chinese edition was machine-assisted and edited, not independently specialist-reviewed. Structural validation cannot establish translation accuracy. Check both languages in the browser, including bilingual search, Chinese input composition, formula display, and narrow layouts.

## Verify both editions

Run `npm run validate`, `npm test`, and `npm run build`. Inspect the changed concept and its traced ancestry in the local application. Check references manually, review historical and conceptual claims separately, and inspect layout and readability at desktop and mobile sizes. Update the editorial review date in `src/data/atlas.ts` when revising the collection.

The content validator checks shape, required references, IDs, chronology, cycles, and tours. It cannot establish scholarly accuracy, link availability over time, or completeness of attribution; those require source review.

## Branches, periods, and rendering

`branches.json` has its own version, a stable section order, and ordered branch IDs. Keep IDs stable when renaming labels. The expanded release covers all 12 sections and 43 subbranches. `validateReleaseCoverage` checks 430–470 concepts and nonempty branches separately from the reusable content contract; revise those release targets intentionally for a later edition.

Dates remain exact sorting anchors. The layout uses prehistory before 5000 BCE, 500-year floors to 500 BCE, 100-year floors to 1500, 25-year floors to 1850, 10-year floors to 1900, and five-year floors afterward. Era boundaries split periods. Empty floors are omitted. The precise chronological index is unaffected by these visual bins. Similar height means approximate contemporaneity, not simultaneous discovery.

An era reserves each active subbranch's width according to its busiest floor. Branches stay in catalog order; sections are centered as a whole and may grow or shrink between eras. Filtering must use the original precomputed layout, never rerun it on a subset. Test containment, centering, wide fixtures, and node/edge collisions after geometry changes.

Bundles are derived UI objects grouped by section/subbranch pair, source/target era, relationship type, and evidence classification. They have no place in the authoritative relationship JSON and must never enter ancestry or pillar calculations. Filter membership and count distinct edge IDs. Keep their representative route fixed when filters change. A bundle path stands for a group, not an extra historical claim; expansion shows every actual route.

Legacy hashes remain valid. New optional keys are `branches` (comma-separated branch IDs) and `connections` (`bundled`, `focus`, `all`). An absent or invalid connection mode defaults to `bundled`.
