# Content authoring

The source of truth is the JSON in `src/data/`. Edit it directly. There is no runtime content generator, network-dependent content feed, or public editor.

## Add a concept

Choose the most appropriate collection: `foundations.json`, `physical.json`, `life-earth.json`, or `space-computing.json`. Add a unique kebab-case ID that will remain stable if the title changes. The complete interface is `Concept` in `src/types.ts`.

Required fields are title, aliases, primary discipline, tags, kind, date, summary, problem, development, limitations, standing, contributors, source IDs, and separate citation lists for the summary and history. Contributors must include a role. Credit an unnamed community when evidence does not identify individuals; do not invent a first discoverer.

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

## Verify

Run `npm run validate`, `npm test`, and `npm run build`. Inspect the changed concept and its traced ancestry in the local application. Check references manually, review historical and conceptual claims separately, and inspect layout and readability at desktop and mobile sizes. Update the editorial review date in `src/data/atlas.ts` when revising the collection.

The content validator checks shape, required references, IDs, chronology, cycles, and tours. It cannot establish scholarly accuracy, link availability over time, or completeness of attribution; those require source review.
