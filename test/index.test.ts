import { describe, it, afterEach } from "mocha"
import { setTimeout } from "timers/promises"

import {
  createJob,
  deleteJob,
  deleteAllJobs,
  shutdown,
  Job,
} from '../src'

import { expect } from './utils'

describe("job", () => {
  afterEach(() => {
    shutdown();
  });

  it("minimal", async () => {
    let ret = "";

    const job = createJob("test", {
      cron: "*/1 * * * * *",
      onTick: async () => {
        ret += "s";
      },
    });

    expect(job).to.be.an("object");

    await setTimeout(3000);

    expect(ret).to.equal("sss");
  });
});
