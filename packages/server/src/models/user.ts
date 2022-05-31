import { ColorTheme, Status } from "common";
import mongoose from "mongoose";
import { generateId } from "../util";

export interface IUser {
  _id: Buffer;
  created: Date;
  username: string;
  name: string;
  salt: Buffer;
  authKey: Buffer;
  authKeyUpdated: Date;
  publicKey: Buffer;
  encryptedPrivateKey: Buffer;
  avatarId?: Buffer;
  typingEvents: boolean;
  colorTheme: ColorTheme;
  wantStatus: Status;
  totpSecret?: Buffer;
}

export const UserSchema = new mongoose.Schema<IUser>({
  _id: {
    type: Buffer,
    required: true,
    default() {
      return generateId();
    },
  },
  created: {
    type: Date,
    required: true,
    default() {
      return new Date();
    },
  },
  username: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
    default(): string {
      return (this as unknown as IUser).username; //this is the IDE-recommended solution- no really, it is.
    },
  },
  salt: {
    type: Buffer,
    required: true,
  },
  authKey: {
    type: Buffer,
    required: true,
  },
  authKeyUpdated: {
    type: Date,
    required: true,
    default(): Date {
      return (this as unknown as IUser).created;
    },
  },
  publicKey: {
    type: Buffer,
    required: true,
  },
  encryptedPrivateKey: {
    type: Buffer,
    required: true,
  },
  avatarId: {
    type: Buffer,
  },
  typingEvents: {
    type: Boolean,
    required: true,
    default: true,
  },
  colorTheme: {
    type: Number,
    required: true,
    default: ColorTheme.Green,
  },
  wantStatus: {
    type: Number,
    required: true,
    default: Status.Online,
  },
  totpSecret: {
    type: Buffer,
  },
});

export const UserModel = mongoose.model<IUser>("User", UserSchema);
