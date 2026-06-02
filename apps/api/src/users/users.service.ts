import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { UpdateProfileRequest, UserDto } from "@ai-stock-advisor/shared";
import { Model, Types } from "mongoose";
import { User, UserDocument } from "./schemas/user.schema";

export interface GoogleUserProfile {
  email: string;
  name: string;
  avatarUrl?: string;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async findOrCreateFromGoogle(profile: GoogleUserProfile): Promise<UserDto> {
    const user = await this.userModel
      .findOneAndUpdate(
        { email: profile.email.toLowerCase() },
        {
          $set: {
            email: profile.email.toLowerCase(),
            name: profile.name,
          },
          $setOnInsert: {
            avatarUrl: profile.avatarUrl,
            language: "en",
          },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      )
      .exec();

    return this.toDto(user);
  }

  async findById(id: string): Promise<UserDto> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException("User not found");
    }

    const user = await this.userModel.findById(id).exec();

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return this.toDto(user);
  }

  async updateProfile(id: string, input: UpdateProfileRequest): Promise<UserDto> {
    const update = this.buildProfileUpdate(input);

    if (Object.keys(update).length === 0) {
      return this.findById(id);
    }

    const user = await this.userModel
      .findByIdAndUpdate(id, update, { new: true, runValidators: true })
      .exec();

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return this.toDto(user);
  }

  async updateAvatar(id: string, avatarUrl?: string): Promise<UserDto> {
    const user = await this.userModel
      .findByIdAndUpdate(
        id,
        avatarUrl ? { $set: { avatarUrl } } : { $unset: { avatarUrl: 1 } },
        { new: true },
      )
      .exec();

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return this.toDto(user);
  }

  private buildProfileUpdate(input: UpdateProfileRequest): Record<string, unknown> {
    const $set: Record<string, string> = {};
    const $unset: Record<string, 1> = {};

    for (const field of ["firstName", "lastName", "nickname"] as const) {
      const value = input[field];

      if (value === null) {
        $unset[field] = 1;
      } else if (value !== undefined) {
        $set[field] = value;
      }
    }

    for (const field of ["language", "theme"] as const) {
      const value = input[field];

      if (value !== undefined) {
        $set[field] = value;
      }
    }

    return {
      ...(Object.keys($set).length > 0 ? { $set } : {}),
      ...(Object.keys($unset).length > 0 ? { $unset } : {}),
    };
  }

  private toDto(user: UserDocument): UserDto {
    return {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      firstName: user.firstName,
      lastName: user.lastName,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl,
      language: user.language ?? "en",
      theme: user.theme,
      telegramChatId: user.telegramChatId,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}
