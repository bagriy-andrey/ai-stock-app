import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { UsersModule } from "../users/users.module";
import { ProfileAvatarStorageService } from "./profile-avatar-storage.service";
import { ProfileController } from "./profile.controller";

@Module({
  imports: [AuthModule, UsersModule],
  controllers: [ProfileController],
  providers: [ProfileAvatarStorageService],
})
export class ProfileModule {}
