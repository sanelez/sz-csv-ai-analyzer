## [1.3.1](https://github.com/maxgfr/csv-ai-analyzer/compare/v1.3.0...v1.3.1) (2026-03-22)


### Bug Fixes

* improve UX for DataTransform and CSVCompare, fix error handling across app and package ([85e0fdf](https://github.com/maxgfr/csv-ai-analyzer/commit/85e0fdfeea644fd9424a120678e69a84a6109f47))

# [1.2.0](https://github.com/maxgfr/csv-ai-analyzer/compare/v1.1.0...v1.2.0) (2026-03-22)


### Bug Fixes

* **ci:** add --allow-same-version to npm version in release prepare ([57a3cb2](https://github.com/maxgfr/csv-ai-analyzer/commit/57a3cb25a4945adce51e3cdc1c747e6d2195dd9a))
* **ci:** rename release.yml to publish.yml to match npm trusted publisher config ([09316af](https://github.com/maxgfr/csv-ai-analyzer/commit/09316af915e11d3dbc4e66965dd1160872d9ecfc))


### Features

* unify versioning — single semantic-release for app and package ([3b4d822](https://github.com/maxgfr/csv-ai-analyzer/commit/3b4d822daca19a5eccd1ba15c91d992036b0ad77))

# [1.1.0](https://github.com/maxgfr/csv-ai-analyzer/compare/v1.0.1...v1.1.0) (2026-03-22)


### Features

* display app and package versions in UI ([2b62702](https://github.com/maxgfr/csv-ai-analyzer/commit/2b627022516f60829d70914d036fa71322e4175f))

## [1.0.1](https://github.com/maxgfr/csv-ai-analyzer/compare/v1.0.0...v1.0.1) (2026-03-22)


### Bug Fixes

* **csv-charts-ai:** accept ai SDK v6 in peer dependencies ([b50fa35](https://github.com/maxgfr/csv-ai-analyzer/commit/b50fa355a863b1bff737bb62f5a6384ca1bef163))

# 1.0.0 (2026-03-22)


### Bug Fixes

* **ci:** add NPM_TOKEN for semantic-release npm authentication ([9bc08ae](https://github.com/maxgfr/csv-ai-analyzer/commit/9bc08ae51a314cb8d44b7ef9397e058300161e0e))
* **ci:** fix Docker build, deploy, and npm publish workflows ([b9c06c7](https://github.com/maxgfr/csv-ai-analyzer/commit/b9c06c71b0cc2960c23dbb2159cddf25f492150a))
* **ci:** remove NPM_TOKEN, use OIDC trusted publishing ([93e7002](https://github.com/maxgfr/csv-ai-analyzer/commit/93e7002867e21b41522c3e287a93e18a65fa2665))
* **docker:** update base image to node:24-alpine and unfound dependencies ([#4](https://github.com/maxgfr/csv-ai-analyzer/issues/4)) ([62a004f](https://github.com/maxgfr/csv-ai-analyzer/commit/62a004fbf8482250d8d9469433e4d0d4fd9ccc91))
* Refactor and enhance code structure across multiple files ([1b715d2](https://github.com/maxgfr/csv-ai-analyzer/commit/1b715d23d831e48eb8a13135a855b4fd9a898fc7))
* remove change check before committing models update ([1b5f93f](https://github.com/maxgfr/csv-ai-analyzer/commit/1b5f93f2ca08f6ff561844dfbeb357ec4176ec12))
* replace useState and useEffect with useSyncExternalStore for client-side rendering detection ([718b45e](https://github.com/maxgfr/csv-ai-analyzer/commit/718b45ea845c6c45325a5bd985c4b512215edf16))
* Update AI Chart Generation section in README ([7438b1c](https://github.com/maxgfr/csv-ai-analyzer/commit/7438b1c943a29728c003ab89789a7b0b550c65fd))
* update image display in README for better alignment ([a77e5a9](https://github.com/maxgfr/csv-ai-analyzer/commit/a77e5a964973eae7a1bee77f7e3d6d3ee01d670a))
* update subscribe function to return undefined for lint error avoidance ([a8fa52c](https://github.com/maxgfr/csv-ai-analyzer/commit/a8fa52cd5041fcd62ad59f1494170ec2294d895d))
* update URLs to point to the GitHub Pages deployment ([053d15e](https://github.com/maxgfr/csv-ai-analyzer/commit/053d15e53b22719c792ec43902ff6debd9ff336c))


### Features

* add chart enhancements, AI chat features, data transforms, and CSV compare ([f8ef126](https://github.com/maxgfr/csv-ai-analyzer/commit/f8ef12687c6d8eeaf4976f1543b2e0e193a38437))
* add Docker support and custom endpoint configuration for AI services ([159c742](https://github.com/maxgfr/csv-ai-analyzer/commit/159c7429097d3e29f5cd63c4a122c11a9bc473fc))
* add dynamic export for static rendering in image components ([de12bbb](https://github.com/maxgfr/csv-ai-analyzer/commit/de12bbb790ace8dfe96d2e0ee9f552ad80fa8579))
* add GitHub link to footer for easy access to repository ([b669a2d](https://github.com/maxgfr/csv-ai-analyzer/commit/b669a2d13538a7970b6660965c4883ffcbefc57c))
* add pnpm workspace configuration and refactor chart display component ([cb2e1d4](https://github.com/maxgfr/csv-ai-analyzer/commit/cb2e1d49db421fe5de652fb5fe4fa3b5a78952c4))
* add semantic-release with changelog for the app ([6c24d06](https://github.com/maxgfr/csv-ai-analyzer/commit/6c24d06610b9c5cbd642e9d18a57a77e0f1dc8e6))
* **ci:** add Docker build workflow for GitHub Actions ([336e017](https://github.com/maxgfr/csv-ai-analyzer/commit/336e017a2af337e4b9d2f70f74376a34d0b8428c))
* **csv-charts-ai:** add full AI analysis pipeline and simplify app ([26431cc](https://github.com/maxgfr/csv-ai-analyzer/commit/26431ccd76f08a19e2313ddf4668d0e9a25b6641))
* Enhance APIKeySettings and ai-service with custom endpoint handling and error tracking ([86f73c7](https://github.com/maxgfr/csv-ai-analyzer/commit/86f73c73f69278eba9986b9823c337e7e67fcbac))
* Enhance CSV and Chart Suggestions components with error handling and UI improvements ([b5b1dc6](https://github.com/maxgfr/csv-ai-analyzer/commit/b5b1dc6003c1ac85a84d6c0c78482d5c06bacb15))
* Enhance GitHub Actions workflow to support conditional deployment based on model updates ([83bd731](https://github.com/maxgfr/csv-ai-analyzer/commit/83bd731cb0760811b93e1144fd1b013249742ab9))
* enhance README and metadata for better SEO and user engagement ([27d0c2f](https://github.com/maxgfr/csv-ai-analyzer/commit/27d0c2f09f0b4c6fb1734a091206202e83630591))
* enhance UI of FileUpload and Hero components with improved button styles and GitHub link ([8c9caad](https://github.com/maxgfr/csv-ai-analyzer/commit/8c9caad1d1f43aef5d0c58a96216be3aa23b95b9))
* implement chat store for persistent chat history and UI state management ([08d1ce4](https://github.com/maxgfr/csv-ai-analyzer/commit/08d1ce4852b93dcbfc557f12820d3aa635dc5c76))
* implement landing page with key features, demo video, and how it works section ([cb3d57a](https://github.com/maxgfr/csv-ai-analyzer/commit/cb3d57aaef8c82b5b0c2421877be2682b71e118b))
* implement SPA routing and redirection for GitHub Pages in next.config.js; remove obsolete 404.html ([9417572](https://github.com/maxgfr/csv-ai-analyzer/commit/94175720550d3e0e8f100de3fef1325daff0da6b))
* initialize the repository ([96ffc6b](https://github.com/maxgfr/csv-ai-analyzer/commit/96ffc6b37be40ac696546b321edd7c90a9a8712a))
* Integrate Sonner for toast notifications and enhance user feedback across components ([18179b0](https://github.com/maxgfr/csv-ai-analyzer/commit/18179b0b984bc9c54af0c569342d4d3919f7b745))
* rename package to csv-charts-ai and integrate AI chart generation ([186015c](https://github.com/maxgfr/csv-ai-analyzer/commit/186015c1d3a6ce809fc594795a86db5c1b310619))
* Update GitHub Pages deployment configuration and add SPA routing support ([b4bc8a5](https://github.com/maxgfr/csv-ai-analyzer/commit/b4bc8a511bfd76c656126be08c0c9ba35d0068d9))
* Update HowItWorks and LandingPage components to support multiple AI providers ([751ce8d](https://github.com/maxgfr/csv-ai-analyzer/commit/751ce8df96a74cc5a9a7ceb340a209ee35ca1cab))
* Update model fetching logic to support dynamic base path and enhance scheduled model updates ([7decc41](https://github.com/maxgfr/csv-ai-analyzer/commit/7decc410d863e2a7badc54f4c60ae96c0f6a2e9d))
* Update README and components to support multiple AI providers and enhance privacy features ([aee89f6](https://github.com/maxgfr/csv-ai-analyzer/commit/aee89f65652c9a65262b702e540b6343c13f0666))
* **workflow:** add security check workflow for vulnerability assessment ([0a1cfbb](https://github.com/maxgfr/csv-ai-analyzer/commit/0a1cfbb35b07549583e5423e42b5dd2c5726e24f))
