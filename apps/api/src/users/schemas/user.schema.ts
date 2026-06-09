import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type {
  AuthProviderFlags,
  ProfileLanguage,
  ProfileTheme,
  WatchlistViewMode,
} from "@ai-stock-advisor/shared";
import { HydratedDocument } from "mongoose";

@Schema({
  timestamps: true,
  versionKey: false,
})
export class User {
  @Prop({ unique: true, index: true, sparse: true, lowercase: true, trim: true })
  email?: string;

  @Prop({ trim: true })
  name?: string;

  @Prop({ trim: true })
  firstName?: string;

  @Prop({ trim: true })
  lastName?: string;

  @Prop({ trim: true })
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
  })
  providerIds?: {
    google?: string;
    apple?: string;
    facebook?: string;
  };

  @Prop({ required: true, default: false })
  emailVerified!: boolean;

  @Prop({ index: true, sparse: true, trim: true })
  phoneNumber?: string;

  @Prop({ required: true, default: false })
  phoneVerified!: boolean;

  @Prop()
  passwordHash?: string;

  @Prop({ required: true, default: false })
  twoFactorEnabled!: boolean;

  @Prop({ type: String, enum: ["totp", null], default: null })
  twoFactorMethod!: "totp" | null;

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
