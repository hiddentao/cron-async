import { parseCronExpression } from 'cron-schedule'

/**
 * Interface for the logger oject passed as part of the job config.
 */
export interface CronLogger {
  /**
   * Log a trace level log message.
   * @param msg Message to log.
   */
  trace: (msg: any) => void;
  /**
   * Log a debug level log message.
   * @param msg Message to log.
   */
  debug: (msg: any) => void;
  /**
   * Log an error message.
   * @param msg Message to log.
   */
  error: (msg: any) => void;
}

/**
 * Job configuration spec.
 */
export interface JobConfig {
  /**
   * Job schedule in the Linux crontab syntax.
   */
  cron: string
  onTick: (job: Job) => Promise<void>
  log?: CronLogger
  onError?: (err: Error) => void
  dontAutoRun?: boolean
}

class JobLogger implements CronLogger {
  private logger: CronLogger
  private tag: string

  constructor (logger: CronLogger, tag: string) {
    this.logger = logger
    this.tag = tag
  }
  
  trace (msg: string) {
    this.logger.trace(`[${this.tag}] ${msg}`)
  }

  debug (msg: string) {
    this.logger.debug(`[${this.tag}] ${msg}`)
  }

  error (msg: string) {
    this.logger.error(`[${this.tag}] ${msg}`)
  }
}

export class Job {
  private name: string
  private config: JobConfig
  private cron: ReturnType<typeof parseCronExpression>
  private started: boolean = false
  private isExecutingAnIteration: boolean = false
  private lastIterationAt: Date = new Date()
  private log: JobLogger


  constructor(name: string, config: JobConfig) {
    this.name = name
    this.config = config
    this.cron = parseCronExpression(config.cron)
    this.started = !config.dontAutoRun;
    this.log = new JobLogger(config.log || console, name)
  }

  start() {
    this.started = true;
  }

  stop() {
    this.started = false;
  }

  shouldRun (d: Date) {
    return this.cron.getNextDate(this.lastIterationAt).getTime() <= d.getTime()
  }

  async run () {
    if (!this.started) {
      this.log.debug(`Job stopped, skipping run`);
    }

    if (this.isExecutingAnIteration) {
      this.log.trace(`Job still executing previous iteration, skipping run`)
    }

    try {
      this.lastIterationAt = new Date()
      this.isExecutingAnIteration = true
      this.log.debug(`Running job`);

      // do stuff
      await this.config.onTick(this)

      this.log.debug(`Finished running job`);
    } catch (err: any) {
      this.log.error(`Error running job: ${err.message}`)

      if (this.config.onError) {
        this.config.onError(err)
      }
    } finally {
      this.isExecutingAnIteration = false
    }
  }

  destroy () {
    this.stop()
    jobs.delete(this.name)
  }
}

const jobs: Map<string, Job> = new Map()

let isCronRunning = false
let cronIntervalTimer: any = null

const _startCron = () => {
  cronIntervalTimer = setInterval(() => {
    const now = new Date()

    for (const [ name, job ] of jobs) {
      if (job.shouldRun(now)) {
        job.run()
      }
    }

    Object.values(jobs).forEach(job => {
      job.run()
    }, 100)
  })
}


export const createJob = (name: string, job: JobConfig) => {
  if (jobs.has(name)) {
    throw new Error(`Job with name ${name} already exists`)
  }

  jobs.set(name, new Job(name, job))

  if (!isCronRunning) {
    isCronRunning = true
    _startCron()
  }
}


export const getJob = (name: string) => {
  return jobs.get(name)
}


export const getAllJob = () => {
  return [...jobs.values()]
}


export const deleteJob = (name: string) => {
  if (!jobs.has(name)) {
    throw new Error(`Job with name ${name} does not exist`)
  }

  jobs.get(name)!.stop()
  jobs.delete(name)
}


export const deleteAllJobs = () => {
  Object.values(jobs).forEach(job => {
    job.stop()
  })
  jobs.clear()
}



export const shutdown = () => {
  if (cronIntervalTimer) {
    clearInterval(cronIntervalTimer)
  }
  deleteAllJobs()
}

