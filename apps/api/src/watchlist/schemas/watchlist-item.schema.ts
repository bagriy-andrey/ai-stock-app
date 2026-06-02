import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";
import { User } from "../../users/schemas/user.schema";

@Schema({
  timestamps: true,
  versionKey: false,
})
export class WatchlistItem {
  @Prop({ type: Types.ObjectId, ref: User.name, required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ required: true, trim: true, uppercase: true })
  ticker!: string;

  @Prop({ trim: true })
  companyName?: string;

  createdAt!: Date;
  updatedAt!: Date;
}

export type WatchlistItemDocument = HydratedDocument<WatchlistItem>;
export const WatchlistItemSchema = SchemaFactory.createForClass(WatchlistItem);

WatchlistItemSchema.index({ userId: 1, ticker: 1 }, { unique: true });
