import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { UserDto } from "@ai-stock-advisor/shared";
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
            avatarUrl: profile.avatarUrl,
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

  private toDto(user: UserDocument): UserDto {
    return {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      telegramChatId: user.telegramChatId,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}
