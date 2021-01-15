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
