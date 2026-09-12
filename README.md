# SKÅDIS Adapter Studio

A browser-based configurator for printable SKÅDIS adapters.
OpenSCAD WASM handles automatic clip positioning, frame links and solid generation.
JavaScript handles the interface, parameters, preview and downloads—not CAD generation.

## Using it

Change dimensions or placement rules; rendering starts after a 400 ms debounce.
If rendering fails, choose Retry model to start a fresh render.
A 30-second watchdog stops excessive renders. No model data is uploaded.

Manual grid starts from the most recently rendered OpenSCAD positions.
Changing clip count while in manual mode switches to Automatic compact; after
rendering, select Manual grid again to edit the new positions. Locking freezes
the rendered coordinates while OpenSCAD continues checking clearances.

## Validation and exports

The browser exports exactly the triangles rendered by OpenSCAD.
OpenSCAD's native geometry summary must report a valid closed solid. A lightweight
connectivity check rejects disconnected results without loading a second CAD engine.
The former JS positioning/generation code, its Manifold runtime and comparison UI
have been removed. OpenSCAD still uses its own compiled-in Manifold backend.

Downloaded SCAD includes the automatic rules. Save the separately downloaded
`tclip_clip_seat.stl` alongside it. Models remain experimental, un-rated and require
fit/strength testing; mesh validity is not a safety certification.

## Development

```sh
npm ci
npm run dev
npm test
npm run build
```

Tests retain 64 approved layout fixtures (captured before removing the old engine),
exercise seven full OpenSCAD renders, manual/locked coordinates, and rejection paths.
No retired engine is needed to run them. Static output is `out/`.

The read-only `read_adapter_benchmark` WebMCP tool returns the current configuration,
status and render timings when supported.

## Docker

```sh
docker build -t skadis-adapter-studio .
docker run --rm -p 8080:80 skadis-adapter-studio
```

Open http://localhost:8080. The image serves the static app with nginx.

## Licensing

Original adapter code remains MIT (`LICENSE`). Model licences are in `public/models/`.
OpenSCAD has its own GPL licence: see `public/openscad/COPYING` and
`public/openscad/NOTICE.md`. Preserve upstream licence and corresponding-source
requirements before wider redistribution.
