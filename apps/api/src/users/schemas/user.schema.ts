import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type {
  AuthProviderFlags,
  AuthProviderIds,
  ProfileLanguage,
  ProfileTheme,
  TwoFactorMethod,
  WatchlistViewMode,
} from "@ai-stock-advisor/shared";
import { HydratedDocument } from "mongoose";

@Schema({
  timestamps: true,
  versionKey: false,
})
export class User {
  @Prop({
    lowercase: true,
    trim: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email format"],
  })
  email?: string;

  @Prop({ trim: true })
  name?: string;

  @Prop({ trim: true })
  firstName?: string;

  @Prop({ trim: true })
  lastName?: string;

  @Prop({ trim: true, minlength: 3, maxlength: 30 })
  nickname?: string;

  @Prop()
  avatarUrl?: string;

  @Prop({
    type: {
      google: { type: Boolean, default: false },
      email: { type: Boolean, default: false },
      apple: { type: Boolean, default: false },
      facebook: { type: Boolean, default: false },
      phone: { type: Boolean, default: false },
    },
    default: () => ({}),
    _id: false,
  })
  authProviders!: AuthProviderFlags;

  @Prop({
    type: {
      google: { type: String, trim: true },
      apple: { type: String, trim: true },
      facebook: { type: String, trim: true },
    },
    default: () => ({}),
    _id: false,
    select: false,
  })
  providerIds?: AuthProviderIds;

  @Prop({ default: false })
  emailVerified!: boolean;

  @Prop({
    trim: true,
    match: [/^\+[1-9]\d{1,14}$/, "Invalid phone number format"],
  })
  phoneNumber?: string;

  @Prop({ default: false })
  phoneVerified!: boolean;

  @Prop({ select: false })
  passwordHash?: string;

  @Prop({ default: false })
  twoFactorEnabled!: boolean;

  @Prop({ type: String, enum: ["totp", null], default: null })
  twoFactorMethod!: TwoFactorMethod;

  @Prop({ select: false })
  totpSecret?: string;

  @Prop({ enum: ["en", "ru", "uk"], required: true, default: "en" })
  language!: ProfileLanguage;

  @Prop({ enum: ["light", "dark", "system"] })
  theme?: ProfileTheme;

  @Prop({ enum: ["grid", "list"], required: true, default: "grid" })
  watchlistViewMode!: WatchlistViewMode;

  @Prop({ index: true, sparse: true, trim: true })
  telegramChatId?: string;

  createdAt!: Date;
  updatedAt!: Date;
}

export type UserDocument = HydratedDocument<User>;
export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index(
  { email: 1 },
  { unique: true, sparse: true, name: "users_unique_email" },
);
UserSchema.index(
  { nickname: 1 },
  { unique: true, sparse: true, name: "users_unique_nickname" },
);
UserSchema.index(
  { phoneNumber: 1 },
  { unique: true, sparse: true, name: "users_unique_phone_number" },
);
