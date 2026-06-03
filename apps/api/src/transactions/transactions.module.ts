import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AuthModule } from "../auth/auth.module";
import {
  PortfolioTransaction,
  PortfolioTransactionSchema,
} from "./schemas/portfolio-transaction.schema";
import { TransactionsController } from "./transactions.controller";
import { TransactionsService } from "./transactions.service";

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: PortfolioTransaction.name, schema: PortfolioTransactionSchema },
    ]),
  ],
  controllers: [TransactionsController],
  providers: [TransactionsService],
  exports: [TransactionsService],
})
export class TransactionsModule {}
