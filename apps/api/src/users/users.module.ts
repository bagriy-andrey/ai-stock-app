import { Module } from "@nestjs/common";
import { JwtModule, JwtSignOptions } from "@nestjs/jwt";
import { MongooseModule } from "@nestjs/mongoose";
import { getRequiredEnv } from "../config/env";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { User, UserSchema } from "./schemas/user.schema";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";

const jwtExpiresIn = (process.env.JWT_EXPIRES_IN ??
  "7d") as JwtSignOptions["expiresIn"];

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    JwtModule.register({
      secret: getRequiredEnv("JWT_SECRET"),
      signOptions: {
        expiresIn: jwtExpiresIn,
      },
    }),
  ],
  controllers: [UsersController],
  providers: [UsersService, JwtAuthGuard],
  exports: [UsersService],
})
export class UsersModule {}
