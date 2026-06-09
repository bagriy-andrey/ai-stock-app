import mongoose from "mongoose";
import { User, UserSchema } from "./user.schema";

describe("UserSchema", () => {
  const modelName = "UserSchemaSpecUser";
  let UserModel: mongoose.Model<User>;

  beforeAll(() => {
    if (mongoose.models[modelName]) {
      mongoose.deleteModel(modelName);
    }

    UserModel = mongoose.model<User>(modelName, UserSchema);
  });

  afterAll(() => {
    if (mongoose.models[modelName]) {
      mongoose.deleteModel(modelName);
    }
  });

  it("creates users without the new auth fields and applies backward-compatible defaults", () => {
    const user = new UserModel({
      name: "Profile Only",
    });

    expect(user.validateSync()).toBeUndefined();
    expect(user.toObject()).toMatchObject({
      name: "Profile Only",
      authProviders: {
        google: false,
        email: false,
        apple: false,
        facebook: false,
        phone: false,
      },
      emailVerified: false,
      phoneVerified: false,
      twoFactorEnabled: false,
      twoFactorMethod: null,
      language: "en",
      watchlistViewMode: "grid",
    });
  });

  it("keeps legacy Google users valid without migration-only required fields", () => {
    const user = new UserModel({
      email: "legacy@example.com",
      name: "Legacy Google User",
      firstName: "Legacy",
      lastName: "User",
      avatarUrl: "https://example.com/avatar.png",
    });

    expect(user.validateSync()).toBeUndefined();
  });

  it("defines sparse unique indexes for email, nickname, and phone number", () => {
    expect(getIndexOptions({ email: 1 })).toMatchObject({
      unique: true,
      sparse: true,
      name: "users_unique_email",
    });
    expect(getIndexOptions({ nickname: 1 })).toMatchObject({
      unique: true,
      sparse: true,
      name: "users_unique_nickname",
    });
    expect(getIndexOptions({ phoneNumber: 1 })).toMatchObject({
      unique: true,
      sparse: true,
      name: "users_unique_phone_number",
    });
  });

  it("validates email format and nickname length without making either field required", () => {
    expect(new UserModel({ email: "not-an-email" }).validateSync()).toBeDefined();
    expect(new UserModel({ nickname: "ab" }).validateSync()).toBeDefined();
    expect(new UserModel({ nickname: "a".repeat(31) }).validateSync()).toBeDefined();
    expect(
      new UserModel({
        email: "valid@example.com",
        nickname: "analyst",
      }).validateSync(),
    ).toBeUndefined();
  });

  it("marks sensitive persistence fields as excluded from default selections", () => {
    expect(UserSchema.path("providerIds")?.options.select).toBe(false);
    expect(UserSchema.path("passwordHash")?.options.select).toBe(false);
    expect(UserSchema.path("totpSecret")?.options.select).toBe(false);
  });
});

function getIndexOptions(fields: Record<string, 1>) {
  const index = UserSchema.indexes().find(([indexFields]) => {
    return JSON.stringify(indexFields) === JSON.stringify(fields);
  });

  return index?.[1];
}
