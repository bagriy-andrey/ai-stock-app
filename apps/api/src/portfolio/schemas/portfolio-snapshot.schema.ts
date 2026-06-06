import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";
import { User } from "../../users/schemas/user.schema";

@Schema({
  timestamps: true,
  versionKey: false,
})
export class PortfolioSnapshot {
  @Prop({ type: Types.ObjectId, ref: User.name, required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ required: true, index: true })
  snapshotDate!: Date;

  @Prop({ required: true, min: 0 })
  totalValue!: number;

  @Prop({ required: true, min: 0 })
  totalCost!: number;

  @Prop({ required: true })
  totalProfit!: number;

  @Prop({ required: true, min: 0 })
  positionCount!: number;

  createdAt!: Date;
  updatedAt!: Date;
}

export type PortfolioSnapshotDocument = HydratedDocument<PortfolioSnapshot>;
export const PortfolioSnapshotSchema =
  SchemaFactory.createForClass(PortfolioSnapshot);

PortfolioSnapshotSchema.index(
  { userId: 1, snapshotDate: 1 },
  { name: "portfolio_snapshot_user_date", unique: true },
);
