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
  /** 
   * Function to execute each iteration of this job. 
   * @param job Job object.
   */
  onTick: (job: Job) => Promise<void>
  /**
   * Logger object to use for logging.
   */
  log?: CronLogger
  /**
   * Function to execute when an error occurs.
   * @param err Error object.
   */ 
  onError?: (err: Error) => void
  /**
   * If true, the job will not be started automatically.
   * @default false
   */
  dontAutoRun?: boolean
}


/**
 * Logger that prepends a tag to all log messages.
 */
class JobLogger implements CronLogger {
  private logger: CronLogger;
  private tag: string;

  /**
   * Constructor.
   * @param logger base logger.
   * @param tag log message prefix tag.
   */
  constructor(logger: CronLogger, tag: string) {
    this.logger = logger;
    this.tag = tag;
  }

  /**
   * Log a trace level log message.
   * @param msg log message.
   */
  trace(msg: any) {
    this.logger.trace(`[${this.tag}] ${msg}`);
  }

  /**
   * Log a debug level log message.
   * @param msg log message.
   */
  debug(msg: any) {
    this.logger.debug(`[${this.tag}] ${msg}`);
  }

  /**
   * Log an error message.
   * @param msg log message.
   */
  error(msg: any) {
    this.logger.error(`[${this.tag}] ${msg}`);
  }
}

export class Job {
  private parent: Cron;
  private name: string;
  private config: JobConfig;
  private cron: ReturnType<typeof parseCronExpression>;
  private started: boolean = false;
  private isExecutingAnIteration: boolean = false;
  private lastIterationAt: Date = new Date();
  private log: JobLogger;
  private numIterations: number = 0;

  /**
   * Constructor. 
   * @param parent Parent cron instance. 
   * @param name Job name.
   * @param config Job configuration.
   */
  constructor(parent: Cron, name: string, config: JobConfig) {
    this.parent = parent;
    this.name = name;
    this.config = config;
    this.cron = parseCronExpression(config.cron);
    this.started = !config.dontAutoRun;
    this.log = new JobLogger(config.log || console, name);
  }

  /**
   * Start/restart the job.
   */
  start() {
    this.started = true;
  }

  /**
   * Stop the job.
   */
  stop() {
    this.started = false;
  }

  
  isStarted(): boolean {
    return this.started;
  }


  /**
   * Check if the job should run at the given time. 
   * @param d Date to check. 
   * @returns true if the job should run, false otherwise. 
   */
  shouldRun(d: Date) {
    return this.cron.getNextDate(this.lastIterationAt).getTime() <= d.getTime();
  }

  /**
   * Get the number of iterations this job has run. 
   * @returns number of iterations. 
   */
  getNumIterations() {
    return this.numIterations;
  }

  /**
   * Run the job. 
   */
  async run() {
    if (!this.started) {
      this.log.trace(`Job stopped, skipping run`);
      return;
    }

    if (this.isExecutingAnIteration) {
      this.log.trace(`Job still executing previous iteration, skipping run`);
      return;
    }

    try {
      this.lastIterationAt = new Date();
      this.numIterations++;
      this.isExecutingAnIteration = true;
      this.log.debug(`Running job`);

      // do stuff
      await this.config.onTick(this);

      this.log.debug(`Finished running job`);
    } catch (err: any) {
      this.log.error(`Error running job: ${err.message}`);

      if (this.config.onError) {
        this.config.onError(err);
      }
    } finally {
      this.isExecutingAnIteration = false;
    }
  }

  /**
   * Destroy the job.
   * 
   * This will stop the job if it is running and remove it from the parent cron instance.
   */
  destroy() {
    this.stop()
    this.parent.deleteJob(this.name)
  }
}


/**
 * A cron instance.
 */
export class Cron {
  private jobs: Map<string, Job> = new Map();
  private isCronRunning = false;
  private cronIntervalTimer: any = null;

  /**
   * Create a new job. 
   * @param name Unique job name. 
   * @param job Job configuration. 
   * @returns Job object. 
   */
  public createJob(name: string, job: JobConfig) {
    if (this.jobs.has(name)) {
      throw new Error(`Job with name ${name} already exists`);
    }

    this.jobs.set(name, new Job(this, name, job))

    if (!this.isCronRunning) {
      this.isCronRunning = true;
      this._startCron();
    }

    return this.jobs.get(name)!;
  }

  /**
   * Get a job by name. 
   * @param name Job name. 
   * @returns Job object. 
   */
  public getJob(name: string) {
    return this.jobs.get(name);
  }

  /**
   * Get all jobs. 
   * @returns Array of all jobs. 
   */
  public getAllJobs() {
    return [...this.jobs.values()];
  }

  /**
   * Delete a job by name.
   * @param name Job name.
   */
  public deleteJob(name: string) {
    if (!this.jobs.has(name)) {
      throw new Error(`Job with name ${name} does not exist`);
    }

    this.jobs.get(name)!.stop();
    this.jobs.delete(name);
  }

  /**
   * Delete all jobs. 
   */
  public deleteAllJobs() {
    Object.values(this.jobs).forEach((job) => {
      job.stop();
    });
    this.jobs.clear();
  }

  /**
   * Shutdown the cron instance. 
   */
  public shutdown() {
    if (this.cronIntervalTimer) {
      clearInterval(this.cronIntervalTimer)
      this.isCronRunning = false
    }
    this.deleteAllJobs()
  }

  private _startCron() {
    if (this.cronIntervalTimer) {
      clearInterval(this.cronIntervalTimer);
    }

    this.cronIntervalTimer = setInterval(() => {
      const now = new Date();

      for (const [name, job] of this.jobs) {
        if (job.shouldRun(now)) {
          job.run();
        }
      }

      Object.values(this.jobs).forEach((job) => {
        job.run();
      }, 100);
    });
  }
}


