import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import { TransactionsService } from "../transactions/transactions.service";
import { PortfolioPerformanceService } from "./portfolio-performance.service";

const dailySnapshotHourUtc = 23;
const dailySnapshotMinuteUtc = 45;

@Injectable()
export class PortfolioSnapshotScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PortfolioSnapshotScheduler.name);
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly performanceService: PortfolioPerformanceService,
    private readonly transactionsService: TransactionsService,
  ) {}

  onModuleInit(): void {
    this.scheduleNextRun();
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearTimeout(this.timer);
    }
  }

  private scheduleNextRun(): void {
    const delayMilliseconds = this.getMillisecondsUntilNextRun(new Date());

    this.timer = setTimeout(() => {
      void this.runDailySnapshots().finally(() => this.scheduleNextRun());
    }, delayMilliseconds);
  }

  private async runDailySnapshots(): Promise<void> {
    const userIds = await this.transactionsService.findUserIdsWithTransactions();

    for (const userId of userIds) {
      try {
        await this.performanceService.generateCurrentSnapshotForUser(userId);
      } catch (error) {
        this.logger.error(
          `Failed to generate portfolio snapshot for user ${userId}`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }
  }

  private getMillisecondsUntilNextRun(now: Date): number {
    const nextRun = new Date(now);
    nextRun.setUTCHours(dailySnapshotHourUtc, dailySnapshotMinuteUtc, 0, 0);

    if (nextRun.getTime() <= now.getTime()) {
      nextRun.setUTCDate(nextRun.getUTCDate() + 1);
    }

    return nextRun.getTime() - now.getTime();
  }
}
