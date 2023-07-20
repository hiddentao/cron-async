[![NPM module](https://badge.fury.io/js/cron-async.svg)](https://badge.fury.io/js/cron-async)
[![Follow on Twitter](https://img.shields.io/twitter/url/http/shields.io.svg?style=social&label=Follow&maxAge=2592000)](https://twitter.com/hiddentao)

# cron-async

Javascript library for execute tasks on a schedule, using cron syntax, with async/await support. It is inspired by [node-cron](https://www.npmjs.com/package/cron).

It's smart at handling async jobs. All executions are wrapped in a `try-catch` clause and errors are caught and logged. It also waits until the current iteration of 
a job has finished executing before starting the next iteration, regardless of the jobs's schedule.

Features:

* Works in both Node.js and Browsers.
* Performant: uses a single interval timer for all created jobs.
* Customizable logger.
* Typesript support / fully typed.
* Auto-generated [documentation](https://hiddentao.github.io/cron-async).

## Installation

* NPM: `npm i cron-async`
* Yarn: `yarn add cron-async`
* PNPM: `pnpm add cron-async`

## Usage


_TODO_

## Developer guide

To build both ESM and CommonJS output:

```shell
pnpm build
```

To re-build the CommonJS output on chnage:

```shell
pnpm dev
```

To test:

```shell
pnpm test
```

To build the docs:

```shell
pnpm build-docs
```

To publish a new release (this will create a tag, publish to NPM and publish the latest docs):

```shell
pnpm release
```

## License

MIT