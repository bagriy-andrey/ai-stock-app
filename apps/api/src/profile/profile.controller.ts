import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { UserDto } from "@ai-stock-advisor/shared";
import type { AuthenticatedRequest } from "../auth/authenticated-request";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { UsersService } from "../users/users.service";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { profileAvatarMaxBytes } from "./profile-avatar.config";
import {
  ProfileAvatarStorageService,
  type UploadedAvatarFile,
} from "./profile-avatar-storage.service";

@Controller("profile")
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(
    private readonly usersService: UsersService,
    private readonly avatarStorage: ProfileAvatarStorageService,
  ) {}

  @Get()
  getProfile(@Request() request: AuthenticatedRequest): Promise<UserDto> {
    return this.usersService.findById(this.getAuthenticatedUserId(request));
  }

  @Patch()
  updateProfile(
    @Request() request: AuthenticatedRequest,
    @Body() body: UpdateProfileDto,
  ): Promise<UserDto> {
    return this.usersService.updateProfile(
      this.getAuthenticatedUserId(request),
      body,
    );
  }

  @Post("avatar")
  @UseInterceptors(
    FileInterceptor("avatar", {
      limits: { files: 1, fileSize: profileAvatarMaxBytes },
    }),
  )
  async uploadAvatar(
    @Request() request: AuthenticatedRequest,
    @UploadedFile() file: UploadedAvatarFile | undefined,
  ): Promise<UserDto> {
    const userId = this.getAuthenticatedUserId(request);
    const currentProfile = await this.usersService.findById(userId);
    const avatarUrl = await this.avatarStorage.save(file);

    try {
      const profile = await this.usersService.updateAvatar(userId, avatarUrl);
      await this.avatarStorage.remove(currentProfile.avatarUrl);
      return profile;
    } catch (error) {
      await this.avatarStorage.remove(avatarUrl);
      throw error;
    }
  }

  @Delete("avatar")
  async deleteAvatar(
    @Request() request: AuthenticatedRequest,
  ): Promise<UserDto> {
    const userId = this.getAuthenticatedUserId(request);
    const currentProfile = await this.usersService.findById(userId);
    const profile = await this.usersService.updateAvatar(userId);
    await this.avatarStorage.remove(currentProfile.avatarUrl);
    return profile;
  }

  private getAuthenticatedUserId(request: AuthenticatedRequest): string {
    if (!request.user) {
      throw new Error("Authenticated request is missing user payload");
    }

    return request.user.sub;
  }
}
