import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { PortfolioTransactionType } from "@ai-stock-advisor/shared";
import { HydratedDocument, Types } from "mongoose";
import { User } from "../../users/schemas/user.schema";

@Schema({
  timestamps: true,
  versionKey: false,
})
export class PortfolioTransaction {
  @Prop({ type: Types.ObjectId, ref: User.name, required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ required: true, trim: true, uppercase: true })
  ticker!: string;

  @Prop({ required: true, trim: true })
  companyName!: string;

  @Prop({ enum: ["BUY", "SELL", "UPDATE", "DELETE"], required: true })
  type!: PortfolioTransactionType;

  @Prop({ required: true, min: Number.MIN_VALUE })
  quantity!: number;

  @Prop({ required: true, min: Number.MIN_VALUE })
  price!: number;

  @Prop({ required: true, trim: true, uppercase: true })
  currency!: string;

  @Prop({
    required: true,
    validate: {
      validator: (date: Date) => date.getTime() <= Date.now(),
      message: "transactionDate must not be in the future",
    },
  })
  transactionDate!: Date;

  @Prop({ trim: true })
  notes?: string;

  createdAt!: Date;
  updatedAt!: Date;
}

export type PortfolioTransactionDocument =
  HydratedDocument<PortfolioTransaction>;
export const PortfolioTransactionSchema =
  SchemaFactory.createForClass(PortfolioTransaction);

PortfolioTransactionSchema.index(
  { userId: 1, ticker: 1 },
  { name: "transactions_user_ticker" },
);
PortfolioTransactionSchema.index(
  { userId: 1, transactionDate: -1 },
  { name: "transactions_user_transaction_date" },
);
