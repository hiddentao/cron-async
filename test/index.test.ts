import { describe, it, afterEach } from "mocha"
import { setTimeout } from "timers/promises"

import {
  createJob,
  deleteJob,
  deleteAllJobs,
  shutdown,
  Job,
  CronLogger,
} from '../src'

import { expect } from './utils'

const dummyLogger: CronLogger = {
  trace: () => {},
  debug: () => {},
  error: () => {},
}

describe("job", () => {
  afterEach(() => {
    shutdown();
  });

  it("basic functionality", async function () {
    this.timeout(5000)

    let ret = "";

    const job = createJob("test", {
      cron: "*/1 * * * * *",
      onTick: async () => {
        ret += "s";
      },
    });

    expect(job).to.be.an.instanceOf(Job)

    await setTimeout(3000);

    expect(ret).to.equal("sss")
  })

  it("custom logger", async function () {
    this.timeout(5000);

    let ret = "";

    const job = createJob("test", {
      cron: "*/1 * * * * *",
      onTick: async () => {
        ret += "s";
      },
      log: dummyLogger,
    });

    expect(job).to.be.an.instanceOf(Job);

    await setTimeout(3000);

    expect(ret).to.equal("sss");
  });

  it('stopping and starting', async function () {
    this.timeout(6000)

    let ret = "";

    const job = createJob("test", {
      cron: "*/1 * * * * *",
      onTick: async () => {
        ret += "s";
      },
      log: dummyLogger,
    });

    job.stop()

    await setTimeout(2000)

    job.start()

    await setTimeout(1000);

    expect(ret === 'ss' || ret === 's').to.be.true
  })
})
