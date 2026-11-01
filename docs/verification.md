# Edition 1 verification

Reviewed on 2026-11-01.

## Automated checks

`npm test` passes all 15 tests. `npm run build` passes content validation, TypeScript checking, and the Vite production build.

The bundled collection contains 260 concepts, 471 relationships, 296 source records, 93 representative formulas/definitions, six tours with 71 narrated stops, and 29 pillars. Validation checks required content, citations (including representations), unique IDs, valid endpoints, dating notes, duplicate connections, cycles, chronological order, tour references, and node overlap. The final build has no chunk-size warnings.

Tests cover multi-parent ancestry, unique descendant counting, filtered context, relationship-filter traversal, contributor and alias searches, deterministic positions, URL serialization, invalid URL normalization, invalid graph detection, pillar eligibility, and tour completeness.

Additional checks verify that every chronological row and era boundary is centered on the same axis, a synthetic crowded year expands beyond the former nine-column width without wrapping, and formal representations have explanations and citations. URL tests include the content-display choice and fallback for unknown values.

## Browser review

The application was reviewed in a Chromium-based browser at desktop, tablet (820 × 900), and mobile (390 × 844) sizes, with the complete collection loaded.

- Stepped through all 71 stops of the six journeys and reached each completion control.
- Checked search results, an empty search, combined filters, empty-filter recovery, and era navigation.
- Verified that physics-only ancestry for general relativity retains mathematical concepts as context.
- Checked concept and tour URL state, reload, and browser Back/Forward restoration.
- Opened concepts from the chronological index using the keyboard and opened a graph connection using Enter.
- Checked the methodology dialog, Escape dismissal, mobile navigation, reading sheet, and mobile tour controls.
- Reviewed selected-node centering, line layering, the overview map, zoom controls, and responsive layouts.
- Confirmed that the mobile document does not overflow horizontally.
- Verified Words/Formulas switching in the tower, index, and detail sheet; unchanged node positions; mode restoration with Back; and prose fallback for entries without a representation.
- Smoke-tested the final production build served by `npm run preview`; no production console warnings or errors were observed.

Reduced-motion preferences are honored by CSS transitions and animated viewport controls. Text contrast and focus indicators were reviewed during implementation. This was a manual accessibility review, not a comprehensive screen-reader or WCAG certification.

## Editorial scope

Entries and relationships include source references and distinguish documented influence from editorial conceptual connections. Dates and difficult attributions were checked against scholarly histories, original publications, and institutional sources. This remains a curated introductory synthesis, not an exhaustive or independently peer-reviewed history. Automated checks establish structural integrity, not the truth of every historical claim.

## Preview images

![Desktop atlas](preview-desktop.png)

![Mobile formula view](preview-mobile.png)
