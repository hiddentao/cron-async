import { describe, it, afterEach } from "mocha"
import { setTimeout } from "timers/promises"

import {
  Job,
  CronLogger,
  Cron,
} from '../src'

import { expect } from './utils'

interface TestLogger extends CronLogger {
  logs: {
    trace: string[],
    debug: string[],
    error: string[],
  }
}

const testLogger = (): TestLogger => {
  const logs = {
    trace: [] as string[],
    debug: [] as string[],
    error: [] as string[],
  }

  return {
    logs,
    trace: (msg: any) => logs.trace.push(msg),
    debug: (msg: any) => logs.debug.push(msg),
    error: (msg: any) => logs.error.push(msg),
  }
}

describe("job", () => {
  beforeEach(function () {
    this.cron = new Cron()
  })

  afterEach(function () {
    this.cron.shutdown()
  })

  it("basic functionality", async function () {
    this.timeout(5000)

    let ret = "";

    const job = this.cron.createJob("test", {
      cron: "*/1 * * * * *",
      onTick: async () => {
        ret += "s";
      },
    });

    expect(job).to.be.an.instanceOf(Job)

    await setTimeout(3000);

    expect(ret).to.equal("sss")
    expect(job.getNumIterations()).to.equal(3)
  })

  it("create job with same name", async function () {
    const log = testLogger();

    this.cron.createJob("test", {
      cron: "*/1 * * * * *",
      onTick: async () => {},
      log,
    });

    expect(() => {
      this.cron.createJob("test", {
        cron: "*/1 * * * * *",
        onTick: async () => {},
        log,
      })
    }).to.throw("Job with name test already exists")
  });

  it('get job', async function () {
    const log = testLogger();

    const job = this.cron.createJob("test", {
      cron: "*/1 * * * * *",
      onTick: async () => {},
      log,
    });

    expect(this.cron.getJob("test")).to.equal(job)
  })

  it("get all jobs", async function () {
    const log = testLogger();

    const job1 = this.cron.createJob("test", {
      cron: "*/1 * * * * *",
      onTick: async () => {},
      log,
    });

    const job2 = this.cron.createJob("test2", {
      cron: "*/1 * * * * *",
      onTick: async () => {},
      log,
    });

    const jobs = this.cron.getAllJobs();
    expect(jobs[0]).to.equal(job1)
    expect(jobs[1]).to.equal(job2)
  })

  it("delete job", async function () {
    this.timeout(5000)

    let ret = ""
    const log = testLogger();

    this.cron.createJob("test", {
      cron: "*/1 * * * * *",
      onTick: async () => {
        ret += "s";
      },
      log,
    });

    await setTimeout(1200)

    this.cron.deleteJob("test");

    await setTimeout(1200)

    expect(this.cron.getJob("test")).to.be.undefined;
    expect(ret).to.equal('s')
  })

  it("destroy job", async function () {
    this.timeout(5000);

    let ret = "";
    const log = testLogger();

    const job = this.cron.createJob("test", {
      cron: "*/1 * * * * *",
      onTick: async () => {
        ret += "s";
      },
      log,
    });

    await setTimeout(1200);

    job.destroy()

    await setTimeout(1200);

    expect(this.cron.getJob("test")).to.be.undefined;
    expect(ret).to.equal("s");
  });

  it("delete invalid job", async function () {
    expect(() => {
      this.cron.deleteJob("test")
    }).to.throw("Job with name test does not exist")
  });

  it("delete all jobs", async function () {
    this.timeout(5000);

    let ret1 = "";
    let ret2 = "";
    const log = testLogger();

    this.cron.createJob("test1", {
      cron: "*/1 * * * * *",
      onTick: async () => {
        ret1 += "s";
      },
      log,
    });

    this.cron.createJob("test2", {
      cron: "*/1 * * * * *",
      onTick: async () => {
        ret2 += "t";
      },
      log,
    });

    await setTimeout(1100);

    this.cron.deleteAllJobs();

    await setTimeout(1200);

    expect(this.cron.getAllJobs()).to.have.lengthOf(0);
    expect(ret1).to.equal("s")
    expect(ret2).to.equal("t")
  });

  it("custom logger", async function () {
    this.timeout(5000);

    let ret = "";
    const log = testLogger();

    const job = this.cron.createJob("test", {
      cron: "*/1 * * * * *",
      onTick: async () => {
        ret += "s";
      },
      log,
    });

    expect(job).to.be.an.instanceOf(Job);

    await setTimeout(3000);

    expect(ret).to.equal("sss");

    expect(log.logs.debug).to.have.lengthOf(6)
    expect(log.logs.debug[0]).to.eql("[test] Running job")
    expect(log.logs.debug[1]).to.eql("[test] Finished running job")
  })

  it("do not auto-run", async function () {
    this.timeout(6000);

    const log = testLogger();

    const job = this.cron.createJob("test", {
      cron: "*/1 * * * * *",
      onTick: async () => {},
      log,
      dontAutoRun: true,
    });

    await setTimeout(2000);

    expect(log.logs.debug[0]).to.eql("[test] Job stopped, skipping run")
    expect(job.getNumIterations()).to.equal(0)

    job.start();

    await setTimeout(1200);

    expect(job.getNumIterations()).to.be.greaterThan(0)
  })

  it('stopping and starting', async function () {
    this.timeout(6000)

    let ret = "";
    const log = testLogger();

    const job = this.cron.createJob("test", {
      cron: "*/1 * * * * *",
      onTick: async () => {
        ret += "s";
      },
      log,
    });

    job.stop()

    await setTimeout(2000)

    job.start()

    await setTimeout(1000);

    expect(ret === 'ss' || ret === 's').to.be.true

    expect(log.logs.debug[0]).to.eql("[test] Job stopped, skipping run")
  })

  it("error handling", async function () {
    this.timeout(5000);

    const log = testLogger();

    this.cron.createJob("job", {
      cron: "*/1 * * * * *",
      onTick: async () => {
        throw new Error("test");
      },
      onError: (err: any) => {
        log.logs.error.push(`onError: ${err.message}`);
      },
      log,
    });

    await setTimeout(1200);

    expect(log.logs.error).to.have.lengthOf(2)
    expect(log.logs.error[0]).to.eql("[job] Error running job: test");
    expect(log.logs.error[1]).to.eql("onError: test");
  })

  it("overrunning iteration", async function () {
    this.timeout(7000);

    let numIterations = 0
    const log = testLogger();

    this.cron.createJob("job", {
      cron: "*/1 * * * * *",
      onTick: async () => {
        numIterations++;
        await setTimeout(3000);
      },
      log,
    });

    await setTimeout(3000)

    expect(numIterations).to.equal(1)
    expect(log.logs.trace[0]).to.eql(
      "[job] Job still executing previous iteration, skipping run"
    );

    await setTimeout(2000)

    expect(numIterations).to.equal(2)
  })
})
