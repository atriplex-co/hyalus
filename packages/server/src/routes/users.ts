import express from "express";
import sodium from "libsodium-wrappers";
import { SessionModel } from "../models/session";
import { UserModel } from "../models/user";
import {
  authKeyValidator,
  encryptedPrivateKeyValidator,
  publicKeyValidator,
  rateLimitMiddleware,
  saltValidator,
  usernameValidator,
  validateMiddleware,
} from "../util";

const app = express.Router();

app.post(
  "/",
  async (req: express.Request, res: express.Response): Promise<void> => {
    if (
      !validateMiddleware(req, res, {
        body: {
          username: usernameValidator.required(),
          salt: saltValidator.required(),
          authKey: authKeyValidator.required(),
          publicKey: publicKeyValidator.required(),
          encryptedPrivateKey: encryptedPrivateKeyValidator.required(),
        },
      }) ||
      !(await rateLimitMiddleware(req, res, {
        scope: {
          tag: "user-create",
          ip: true,
        },
        time: 1000 * 60 * 15,
        tokens: 2,
      })) ||
      !(await rateLimitMiddleware(req, res, {
        scope: {
          tag: "user-create",
          ip: true,
        },
        time: 1000 * 60 * 60 * 24,
        tokens: 10,
      })) // this is mainly to lock tings down a little bit until we have email/sms & captchas.
    ) {
      return;
    }

    req.body.username = req.body.username.toLowerCase();

    if (
      await UserModel.findOne({
        username: req.body.username,
      })
    ) {
      res.status(400).json({
        error: "Username already in use",
      });

      return;
    }

    const user = await UserModel.create({
      username: req.body.username,
      salt: Buffer.from(sodium.from_base64(req.body.salt)),
      authKey: Buffer.from(sodium.from_base64(req.body.authKey)),
      publicKey: Buffer.from(sodium.from_base64(req.body.publicKey)),
      encryptedPrivateKey: Buffer.from(
        sodium.from_base64(req.body.encryptedPrivateKey)
      ),
    });

    const session = await SessionModel.create({
      userId: user._id,
      ip: req.ip,
      agent: req.headers["user-agent"],
    });

    res.json({
      token: sodium.to_base64(session.token),
    });
  }
);

app.get(
  "/:username",
  async (req: express.Request, res: express.Response): Promise<void> => {
    if (
      !validateMiddleware(req, res, {
        params: {
          username: usernameValidator.required(),
        },
      })
    ) {
      return;
    }

    const user = await UserModel.findOne({
      username: req.params.username,
    });

    if (!user) {
      res.status(404).json({
        error: "Invalid username",
      });

      return;
    }

    res.json({
      id: sodium.to_base64(user._id),
      username: user.username,
      name: user.name,
      avatarId: user.avatarId ? sodium.to_base64(user.avatarId) : null,
      publicKey: sodium.to_base64(user.publicKey),
    });
  }
);

export default app;
