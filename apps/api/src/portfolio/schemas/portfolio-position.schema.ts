import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";
import { User } from "../../users/schemas/user.schema";

@Schema({
  timestamps: true,
  versionKey: false,
})
export class PortfolioPosition {
  @Prop({ type: Types.ObjectId, ref: User.name, required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ required: true, trim: true, uppercase: true })
  ticker!: string;

  @Prop({ required: true, trim: true })
  companyName!: string;

  @Prop({ required: true, min: Number.MIN_VALUE })
  quantity!: number;

  @Prop({ required: true, min: Number.MIN_VALUE })
  averagePurchasePrice!: number;

  @Prop({ required: true, trim: true, uppercase: true })
  currency!: string;

  @Prop({
    required: true,
    validate: {
      validator: (date: Date) => date.getTime() <= Date.now(),
      message: "purchaseDate must not be in the future",
    },
  })
  purchaseDate!: Date;

  @Prop({ trim: true })
  notes?: string;

  createdAt!: Date;
  updatedAt!: Date;
}

export type PortfolioPositionDocument = HydratedDocument<PortfolioPosition>;
export const PortfolioPositionSchema =
  SchemaFactory.createForClass(PortfolioPosition);
