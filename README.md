# Tower of Science

An interactive museum atlas of **450 scientific concepts**, from early counting to modern theoretical frameworks. Follow historical influences, mathematical foundations, enabling discoveries, and revisions across 12 science sections and 43 named subbranches.

The application runs locally and builds into a static website. Its content and fonts are bundled; opening a source citation is the only interaction that needs an external site. No account, backend, API key, or deployment is required.

**Explore the published atlas:** [Tower of Science](https://yi1z.github.io/tower-of-science/).

## Run locally

Use Node.js 22.12 or newer and npm.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite, normally `http://127.0.0.1:5173`.

```sh
npm run validate   # Content, graph, citations, tours, and layout integrity
npm test           # Graph, filtering, search, links, and validation tests
npm run build      # Validate, type-check, and build dist/
npm run preview    # Serve the production build locally
```

## GitHub Pages

The [deployment workflow](.github/workflows/deploy-pages.yml) automatically publishes updates pushed to `main`. It installs the lockfile dependencies with Node.js 22, runs the tests, validates the content, type-checks the application, and builds the site before uploading only `dist/`. A separate deployment job publishes the successful build to the `github-pages` environment. Deployments are serialized; a running deployment is never canceled by a newer push.

To deploy manually, open the repository's **Actions → Deploy to GitHub Pages → Run workflow**, select **main**, and run it. To retry a failed deployment, open its workflow run and choose **Re-run failed jobs** after resolving the cause. Only `main` can publish. Under **Settings → Pages → Build and deployment**, the source must be **GitHub Actions**.

The workflow sets `VITE_BASE_PATH=/tower-of-science/` so JavaScript, styles, fonts, and the favicon resolve under the project URL. Local commands keep the relative `./` base by default. Concept, filter, and journey links use the URL hash and support refresh and browser Back/Forward on Pages without server rewrites.

## Explore

- Search for a concept, alias, or contributor. Press Ctrl/Cmd+K to focus search.
- Select a concept to see its introduction, origins, contributors, limitations, and supporting references. Closing its detail panel preserves your camera position and zoom. The index also preserves the camera until you select a different concept.
- Drag from blank space, an edge, a bundle count, or a collapsed pillar to pan. A short click still opens the relationship; dragging never opens it accidentally.
- Zoom out to see inactive subbranches, then major sections, represented by serif names and discipline symbols centered inside their existing pillars. Narrow pillars rotate their titles; they never move or become floating cards. Select a pillar to reveal its ideas without changing selection or filters. Active paths remain individual; summary bundles retain all original relationship evidence.
- Switch between **Words** and **Formulas & definitions** in the toolbar or detail panel. The 283 sourced representations include symbol explanations and assumptions; other entries retain their prose. This choice is included in shared links and retained during tours and resets.
- Use **Trace origins** or **Follow influence** to highlight multiple generations. Filtered-out connecting concepts remain visible as dashed context nodes.
- Choose **Bundled**, **Focus only**, or **All connections**. Open a counted bundle (or the bundle index beside the selector) to inspect all member relationships and citations, then **Expand these connections** to see their individual paths. Selecting an idea reveals its immediate links.
- Select a connection or expand **Why they connect** in a concept panel to read its evidence.
- Navigate by era, section, or subbranch. Expand a section in the sidebar: tick checkboxes to filter, or use a branch arrow to visit its region in the current era. The sticky ruler provides the same navigation. Combine branch, discipline, standing, and relationship filters without moving cards.
- Use **Index** for a chronological reading view, **Pillars** for concepts with many descendants, or **Journeys** for six narrated tours.
- Copy a view’s browser address to preserve its selected concept, tour step, filters, connection mode, and content display mode. Browser Back and Forward restore these selections.
- Read **About the atlas** for dating conventions, source policy, relationship definitions, and limits of coverage.

## Architecture

React and TypeScript render the application; React Flow supplies the graph viewport and interactions. `src/graph.ts` computes deterministic chronological positions and graph indexes. Shared historical periods form floors. Each era reserves separate subbranch regions sized for their busiest floor. Cards are centered within those cells, and era bounds are centered overall. Growing science sections join across era gaps. Individual routes use empty floor gutters and fan their ports to avoid unrelated cards. Bundle membership and routes are precomputed separately from the authoritative historical graph. `src/overview.ts` maps summaries onto fixed pillar bounds with zoom hysteresis and cached gutter routes. One SVG layer draws connections and culls by actual route segments, eliminating invisible anchor nodes. `src/viewport.ts` updates caption transforms without rerendering the graph. During gestures, `src/MotionConnections.tsx` caches inactive connection ink in an overscanned canvas; selected paths remain SVG, and all interactive SVG paths return after 120 ms of rest. The minimap separates static artwork from its camera indicator. `src/interaction.ts` and `src/useEdgePan.ts` distinguish explicit camera navigation and click/drag gestures. `src/state.ts` encodes view state in the URL hash. No force simulation or layout recalculation occurs while filtering or switching content display.

Content lives in seven JSON collections in the versioned atlas under `src/data/`, with separate tour and versioned branch catalogs. `src/types.ts` defines the content interfaces and `src/validate.ts` enforces the authoring contract. The atlas metadata records its edition and editorial review date.

The visual design uses locally packaged DM Sans and Libre Caslon Display, CSS, and SVG. Font licenses are included with their npm packages. React Flow attribution remains visible.

## Editorial boundaries

This is an introductory, source-linked synthesis, not an exhaustive history or a specialist-reviewed scholarly edition. Approximate dates select milestones for navigation. Similar ideas do not establish historical transmission. Conceptual edges explicitly identify editorial inferences. Open and speculative proposals are distinguished from established frameworks; obsolete models remain for historical context.

Source records include original papers, scholarly histories, official scientific institutions, and textbooks. Some publishers restrict full text; their public abstracts or publication records support bibliographic milestones. Automated validation checks reference integrity and graph structure, not the truth of every claim. Continued specialist review is valuable.

See [Content authoring](docs/content-authoring.md) to add or revise an entry.

See [Verification notes and preview images](docs/verification.md) for the checks completed on this edition.

## Local motion benchmark

Open the production preview with `?benchmark=1`, expand **Local motion benchmark**, and run it with the browser foregrounded. The opt-in panel measures the same pan/zoom sequence at card, subbranch, and section scales. It reports frame intervals, long tasks, and application/summary/route/node-array/component render counts. Repeat with each connection mode and a selected concept. `validTiming: false` flags insufficient samples or one-second browser throttling; those runs are not evidence of a frame-rate target. No observers run in normal sessions.
