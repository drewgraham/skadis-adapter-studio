# SKÅDIS Adapter Studio

A browser-based tool for designing 3D-printable adapters for objects with keyhole mounting pegs and optional supporting feet. Adjust the dimensions, inspect the live model, and download STL or OpenSCAD files.

Independent hobby project; not affiliated with or endorsed by IKEA.

## Features

- One or two mounting pegs, with optional foot cradles.
- Linked frame or full supporting back.
- Configurable T-Clip placement on the SKÅDIS grid.
- Interactive 3D preview with rotation and zoom.
- STL generation in a browser worker using Manifold WebAssembly.
- OpenSCAD export and separately downloadable clip geometry.

Model generation runs in your browser. Dimensions and generated models are not uploaded by the application. Your hosting provider may still keep ordinary web request logs.

## Quick start with Docker

Install Docker, download or clone this repository, and run these commands from its root:

```sh
docker build -t skadis-adapter-studio .
docker run --rm --name skadis -p 127.0.0.1:8080:80 skadis-adapter-studio
```

Open **http://localhost:8080**. Stop the container with Ctrl+C.

The image builds the application with Next.js and serves the static output with Nginx. No database, API key or account is required. The included Nginx configuration serves JavaScript modules and WebAssembly with the correct content types.

## Docker Compose

Create a `compose.yml` in the repository root:

```yaml
services:
  skadis:
    build: .
    restart: unless-stopped
    ports:
      - "127.0.0.1:8080:80"
```

Start or rebuild it with:

```sh
docker compose up -d --build
```

### Behind Traefik

If you already run Traefik, replace the example above with:

```yaml
services:
  skadis:
    build: .
    restart: unless-stopped
    networks:
      - proxy
    labels:
      - traefik.enable=true
      - traefik.docker.network=proxy
      - traefik.http.routers.skadis.rule=Host(`skadis.example.com`)
      - traefik.http.routers.skadis.entrypoints=websecure
      - traefik.http.routers.skadis.tls=true
      - traefik.http.routers.skadis.tls.certresolver=letsencrypt
      - traefik.http.services.skadis.loadbalancer.server.port=80

networks:
  proxy:
    external: true
```

Replace the hostname, network, entry point and certificate resolver with your own values. Traefik must share that network, have its Docker provider enabled, and already be configured for certificate issuance. Configure DNS and inbound routing for your hostname separately.

Serve the app at the root of its hostname, rather than a subdirectory: the CAD worker and model assets use root-relative URLs.

## Using the designer

1. Measure the object's peg spacing, peg dimensions and foot positions.
2. Choose the base construction, peg count and whether foot supports are needed.
3. Adjust the clip placement and dimensions; wait for **Solid model ready**.
4. Rotate and inspect the preview, then download the STL for your slicer.
5. For the OpenSCAD source, also download the T-Clip seat geometry and keep it alongside the source file.
6. Download and print the separate clips as required for your configuration.

The preview confirms that geometry was generated; it is not a strength or safety assessment.

## Local development

Use Node.js 22.13 or newer and npm. Install the locked dependencies:

```sh
npm ci
npm run dev
```

Open **http://localhost:3000**.

To produce the same static export used by Docker, on a POSIX shell:

```sh
npm run build
```

The files are written to `out/`. Serve the output using a web server with JavaScript module and WebAssembly MIME types; opening the HTML directly from disk will not work.

The application is a static export. Use Docker/Nginx for production hosting; `next start` is not applicable.

### Checks

After installing dependencies, run the geometry checks:

```sh
npm test
```

`npm run build` also checks TypeScript and generates the production pages. Docker runs the geometry tests before building.

## Project layout

- `app/` — interface, styles and safety notice.
- `components/` — controls and reusable UI.
- `lib/` — configuration and export helpers.
- `public/cad/` — geometry generation, worker and WebAssembly assets.
- `public/models/` — CAD source, model assets and attribution.
- `tests/` — geometry checks.
- `Dockerfile`, `nginx.conf` — standalone static hosting.

## Safety and support

The tool and generated files are experimental design aids, not engineering advice or certified products. No load rating is provided. Check dimensions, materials, print quality, fixings and compatibility. Safely test each finished part before use and inspect it regularly.

Do not use printed adapters for safety-critical purposes, overhead loads or where failure could cause injury. Heat, ageing and sustained loads can weaken printed parts. Print settings are starting points, not guarantees.

To the extent permitted by law, this tool and its generated files are provided “as is” and “as available”, without warranty of accuracy, reliability or fitness for a particular purpose. No technical support, maintenance, updates or continued availability are promised.

## Contributing

Bug reports and improvements are welcome. Include steps to reproduce, the relevant dimensions and browser details when reporting a problem. For geometry changes, add or update focused checks and describe the effect on generated models. Do not include private information or credentials.

## Licence

Original application code and hosting configuration are licensed under the [MIT License](LICENSE), copyright © 2026 Andrew Graham. MIT permits commercial use, including paid hosting, subject to its notice requirements.

Separately licensed material retains its existing terms:

- The OpenSCAD generator, generated model examples, associated CAD documentation and Line Arc Line seat geometry retain their CC BY 4.0 notices.
- The two tchoupshop low-profile clip models retain CC BY-SA 4.0.
- See [CAD licence details](public/models/LICENSE.txt) and [attribution](public/models/ATTRIBUTION.md), including for duplicate model files elsewhere in this repository.
- Dependencies and vendored code retain their upstream licences, including the [vendored stylesheet licence](vendor/shadcn-tailwind-4.13.0.LICENSE.md).

IKEA and SKÅDIS names describe compatibility only; their respective owners retain their rights.
