# Gastronomic Open Standard (GOS) Monorepo Licensing Map

This document outlines the licensing strategy and specific SPDX assignments for the various packages within the GOS monorepo. The monorepo uses a mixed-license approach to balance open-source application distribution with permissible library consumption.

## Overview

The GOS project uses two primary licenses:
- **AGPL-3.0-or-later**: Applied to the main end-user applications.
- **Apache-2.0**: Applied to the workspace root, the corpus data, and distributable libraries.

This document serves as the authoritative map for how licenses are applied, rather than duplicating license texts across the repository.

## Applications (AGPL-3.0-or-later)

The primary user-facing applications in the GOS monorepo are licensed under the GNU Affero General Public License v3.0 or later (`AGPL-3.0-or-later`). This ensures that modifications to these services, even when deployed over a network, remain open source.

*   **`gos-site`**: The main Astro application located in `site/`. The license is declared in `site/package.json`.
*   **`gos-api-gateway`**: The Cloudflare Worker application located in `worker/`. The license is declared in `worker/package.json`.

*Note: Neither `site/` nor `worker/` contains a separate full LICENSE file paste to avoid redundancy. The SPDX identifier in their respective `package.json` files, combined with this document, establishes their license.*

## Libraries (Apache-2.0)

Libraries intended for broad ecosystem consumption and integration into other projects, potentially including proprietary ones, use the more permissive Apache License 2.0.

*   **`@swal/gos-client`**: The dependency-free client library located in `packages/gos-client/`. It is licensed under `Apache-2.0`, as declared in `packages/gos-client/package.json` and its accompanying `LICENSE` file. It stays that way.

## Exceptions

There are specific historical and derivative-work exceptions within the monorepo that deviate from the standard Apps=AGPL / Libs=Apache rule:

*   **`@swal/health-contract`**: This package, located in `packages/health-contract/`, is a local-first health contract library. Although it is a library, it is licensed under `AGPL-3.0-or-later`. This is an explicit exception recorded in merge commit `aea52b35655b7a5c1a293fafaec1d1788b9ba4f7` because the package is an openGym-derived work. Relicensing it to Apache-2.0 would violate the terms of the openGym upstream source.

## Workspace Root and Corpus Data

The monorepo root and the underlying data corpus are licensed permissively.

*   **Workspace Root**: The root `package.json` specifies `Apache-2.0`. The root `LICENSE` file contains the full Apache License 2.0 text. This covers the overall workspace metadata, scripts, and generic repository scaffolding.
*   **Corpus Data**: The markdown files representing dishes, ingredients, vitamins, etc., declare `license: Apache-2.0` in their frontmatter. This ensures the GOS dataset remains openly accessible and usable without copyleft restrictions.

## Further Information

For the full text of the licenses referenced above:
*   **Apache-2.0**: See the root `LICENSE` file or `packages/gos-client/LICENSE`.
*   **AGPL-3.0-or-later**: See `packages/health-contract/LICENSE` or visit the official GNU website.

*Note: `worker/README.md` and `packages/health-contract/README.md` do not exist. The licensing information for those projects is fully captured by their `package.json` and this document. Furthermore, `site/README.md` is an unrelated scaffold with zero license lines and not a GOS license document.*
