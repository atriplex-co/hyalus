import mongoose from "mongoose";
import { generateToken } from "../util";

export interface ISession {
  _id: Buffer;
  token: Buffer;
  userId: Buffer;
  created: Date;
  lastStart: Date;
  ip: string;
  agent: string;
  pushSubscription?: ISessionPushSubscription;
}

export interface ISessionPushSubscription {
  endpoint: string;
  p256dh: Buffer;
  auth: Buffer;
  proto: number;
}

export const SessionSchema = new mongoose.Schema<ISession>({
  _id: Buffer,
  token: {
    type: Buffer.alloc(0),
    required: true,
    default() {
      return generateToken();
    },
  },
  userId: {
    type: Buffer.alloc(0),
    required: true,
  },
  created: {
    type: Date,
    required: true,
    default() {
      return new Date();
    },
  },
  lastStart: {
    type: Date,
    required: true,
    default() {
      return new Date();
    },
  },
  ip: {
    type: String,
    required: true,
  },
  agent: {
    type: String,
    required: true,
  },
  pushSubscription: {
    type: new mongoose.Schema<ISessionPushSubscription>({
      endpoint: {
        type: String,
        required: true,
      },
      p256dh: {
        type: Buffer.alloc(0),
        required: true,
      },
      auth: {
        type: Buffer.alloc(0),
        required: true,
      },
      proto: {
        type: Number,
        required: true,
      },
    }),
  },
});

export const SessionModel = mongoose.model<ISession>("Session", SessionSchema);
