[![NPM module](https://badge.fury.io/js/cron-async.svg)](https://badge.fury.io/js/cron-async)
[![Follow on Twitter](https://img.shields.io/twitter/url/http/shields.io.svg?style=social&label=Follow&maxAge=2592000)](https://twitter.com/hiddentao)

# cron-async

Javascript library for executing tasks on a schedule, using cron syntax, with async/await support. It is inspired by [node-cron](https://www.npmjs.com/package/cron).

It's smart at handling async jobs. All executions are wrapped in a `try-catch` clause and errors are caught and logged. It also waits until the current iteration of 
a job has finished executing before starting the next iteration, regardless of the jobs's schedule.

Features:

* Works in both Node.js and Browsers.
* Performant: uses a single interval timer for all created jobs.
* Customizable logger.
* Typesript support / fully typed.
* Auto-generated [API documentation](https://hiddentao.github.io/cron-async).

## Installation

* NPM: `npm i cron-async`
* Yarn: `yarn add cron-async`
* PNPM: `pnpm add cron-async`

## Usage

First create a `Cron` instance:

```js
import { Cron } from 'cron-async'

const cron = new Cron()
```

Now add a job:

```js
cron.createJob('job1', {
  cron: "*/1 * * * * *", // every second
  onTick: async () => {
    // do stuff in here on every iteration
  },
})
```

The above job will run automatically every second. You can start and stop the job at any time:

```js
cron.getJob('job1').stop() // stop the job

// ...

cron.getJob('job1').start() // resume the job
```

You can also delete the job from the cron instance entirely in two ways:

```js
// the following statements do the same thing...
cron.deleteJob('job1')
cron.getJob('job1').destroy()
```

By defualt, the logger is the built-in `console` object. You can customize this by overriding the `log` config option:

```js
cron.createJob('job1', {
  cron: "*/1 * * * * *", // every second
  onTick: async () => { /* do stuff */ },
  log: {
    trace: (msg) => { /* do something */ },
    debug: (msg) => { /* do something */ },
    error: (msg) => { /* do something */ },
  }
})
```

You can also specify the job to NOT automatically run when created:

```js
cron.createJob('job1', {
  cron: "*/1 * * * * *", // every second
  onTick: async () => { /* do stuff */ },
  dontAutoRun: true,
})

// later on, we can start the job
cron.getJob('job1').start()
```

Each job keeps track of the number of iterations it has run:

```js
cron.createJob('job1', {
  cron: "*/1 * * * * *", // every second
  onTick: async () => { /* do stuff */ },
  dontAutoRun: true,
})

// after some time....

const n = cron.getJob('job1').getNumIterations()

console.log( `Job has run ${n} times` )
```

The `onTick()` function you provide is automatically wrapped in a `try-catch` clause by the scheduler. If you wish to process any thrown errors you can supply an `onError` handler:

```js
cron.createJob('job1', {
  cron: "*/1 * * * * *", // every second
  onTick: async () => { /* do stuff */ },
  onError: (err: Error) => {
    // do something with the error
  }
})
```

Finally, you can shutdown the `Cron` instance and its internal timer at any point using:

```js
cron.shutdown()
```

For other available methods and properties please see the [API documentation](https://hiddentao.github.io/cron-async).


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