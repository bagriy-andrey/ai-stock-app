import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { ProfileLanguage, ProfileTheme } from "@ai-stock-advisor/shared";
import { HydratedDocument } from "mongoose";

@Schema({
  timestamps: true,
  versionKey: false,
})
export class User {
  @Prop({ required: true, unique: true, index: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ trim: true })
  firstName?: string;

  @Prop({ trim: true })
  lastName?: string;

  @Prop({ trim: true })
  nickname?: string;

  @Prop()
  avatarUrl?: string;

  @Prop({ enum: ["en", "ru", "uk"], required: true, default: "en" })
  language!: ProfileLanguage;

  @Prop({ enum: ["light", "dark", "system"] })
  theme?: ProfileTheme;

  @Prop({ index: true, sparse: true, trim: true })
  telegramChatId?: string;

  createdAt!: Date;
  updatedAt!: Date;
}

export type UserDocument = HydratedDocument<User>;
export const UserSchema = SchemaFactory.createForClass(User);
