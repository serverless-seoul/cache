# [9.0.0](https://github.com/serverless-seoul/cache/compare/v8.1.0...v9.0.0) (2021-10-15)


### Features

* **local:** add local cache ([7f0f245](https://github.com/serverless-seoul/cache/commit/7f0f24592cce2a3bbf3f6433bd52fb1a0a8c126c))


### BREAKING CHANGES

* **local:** change the name of MemcachedFetcher => CacheFetcher

# [8.1.0](https://github.com/serverless-seoul/cache/compare/v8.0.5...v8.1.0) (2021-10-12)


### Features

* **trigger:** trigger build ([91e4602](https://github.com/serverless-seoul/cache/commit/91e4602db00955bb738a4d23b39354045f86ae19))

## [8.0.5](https://github.com/serverless-seoul/cache/compare/v8.0.4...v8.0.5) (2021-10-12)


### Bug Fixes

* **deps:** update dependency cronometro to v1 ([12f92c0](https://github.com/serverless-seoul/cache/commit/12f92c0f3879433e1d440234e4d052ef5b3d0c28))

## [8.0.4](https://github.com/serverless-seoul/cache/compare/v8.0.3...v8.0.4) (2021-06-30)


### Bug Fixes

* **deps:** update dependency ts-node to v10 ([#49](https://github.com/serverless-seoul/cache/issues/49)) ([dd2bc46](https://github.com/serverless-seoul/cache/commit/dd2bc461d95d6a0de421d00e0d02c97ac2bcf551))

## [8.0.3](https://github.com/serverless-seoul/cache/compare/v8.0.2...v8.0.3) (2021-06-30)


### Bug Fixes

* **deps:** update ioredis to v4.27.6 ([5270914](https://github.com/serverless-seoul/cache/commit/527091487accf1ccfbb7291745b71914ab815e10))

## [8.0.2](https://github.com/serverless-seoul/cache/compare/v8.0.1...v8.0.2) (2021-01-15)


### Bug Fixes

* **package:** remove benchmark scripts from npm tarball ([89f626b](https://github.com/serverless-seoul/cache/commit/89f626baadea61d74ed6cc70c4f06b3c5d8a19df))

## [8.0.1](https://github.com/serverless-seoul/cache/compare/v8.0.0...v8.0.1) (2021-01-15)


### Bug Fixes

* update preset ([92d48c3](https://github.com/serverless-seoul/cache/commit/92d48c3f1d18fafc87dfb0c7d6b79e114cb44e36))

# [8.0.0](https://github.com/balmbees/memcached-typed/compare/v7.0.0...v8.0.0) (2021-01-15)


### Bug Fixes

* **driver:** fix time unit of ttl command to seconds ([db5b825](https://github.com/balmbees/memcached-typed/commit/db5b825d10fc3df49393785f9f3c7bef90adaa01))
* **driver:** mark redis client as readonly ([538a121](https://github.com/balmbees/memcached-typed/commit/538a1216687837f068fe809ccac00daebc9e1313))
* **driver:** treat undecodable value as undefined ([6aa9303](https://github.com/balmbees/memcached-typed/commit/6aa9303c5390ff3cb9d47c5844e1cb77d4a4cca2))
* **fetcher:** fix null behavior ([b2a62cc](https://github.com/balmbees/memcached-typed/commit/b2a62ccd31d37ec0bbeda708bf1f8e02501985d4))
* **fetcher:** fix staleTime behavior ([9ce287f](https://github.com/balmbees/memcached-typed/commit/9ce287f629e03ee0d34f3d778a11bbbfb792805a))
* **fetcher:** recover multiFetchDelete method ([6db568e](https://github.com/balmbees/memcached-typed/commit/6db568eee9c98b841cfb55e8f33e35ecb1856ad5))


### chore

* **node:** require Node.js 12+ ([cd81e83](https://github.com/balmbees/memcached-typed/commit/cd81e83b0274e12830fe55f7a02945fd33bc9584))


### Features

* **deps:** update ioredis to v4.19.4 ([bc00612](https://github.com/balmbees/memcached-typed/commit/bc006129722aa62edb2145bbd2eebc8911a18a84))
* **driver:** add ttl support to driver ([7efe4ba](https://github.com/balmbees/memcached-typed/commit/7efe4ba231376701d4cc480084ad184dc4894476))
* **fetcher:** add staleTime option to single fetch method ([624056f](https://github.com/balmbees/memcached-typed/commit/624056f21a8e56c2595d1c71602bb1f93aad9f6a))


### Performance Improvements

* add benchmark scripts ([3cd1b85](https://github.com/balmbees/memcached-typed/commit/3cd1b854ff82eb43e451da23496954c052a8eefe))


### BREAKING CHANGES

* **node:** Changed TypeScript target to ES2019, which breaks backward compatiblity with
Node.js 8 and 10.

## [6.0.1](https://github.com/serverless-seoul/cache/compare/v6.0.0...v6.0.1) (2019-07-17)


### Bug Fixes

* **package:** prepare 6.0.1 release ([7ea674a](https://github.com/serverless-seoul/cache/commit/7ea674a))
