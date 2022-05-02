import mongoose from "mongoose";
import { generateId } from "../util";

export interface IRateLimit {
  _id: Buffer;
  scope: Buffer;
  created: Date;
  expires: Date;
  tokens: number;
}

export const RateLimitSchema = new mongoose.Schema<IRateLimit>({
  _id: {
    type: Buffer,
    default() {
      return generateId();
    },
  },
  scope: {
    type: Buffer,
    required: true,
  },
  created: {
    type: Date,
    required: true,
  },
  expires: {
    type: Date,
    required: true,
    expires: 1,
  },
  tokens: {
    type: Number,
    required: true,
  },
});

export const RateLimitModel = mongoose.model<IRateLimit>(
  "RateLimit",
  RateLimitSchema
);
