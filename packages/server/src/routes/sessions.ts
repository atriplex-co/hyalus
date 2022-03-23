import express from "express";
import sodium from "libsodium-wrappers";
import {
  authKeyValidator,
  authMiddleware,
  idValidator,
  totpCodeValidator,
  usernameValidator,
  validateMiddleware,
  checkTotpCode,
  dispatchSocket,
} from "../util";
import { SocketMessageType } from "common";
import { UserModel } from "../models/user";
import { SessionModel } from "../models/session";

const app = express.Router();

app.post(
  "/",
  async (req: express.Request, res: express.Response): Promise<void> => {
    if (
      !validateMiddleware(req, res, {
        body: {
          username: usernameValidator.required(),
          authKey: authKeyValidator,
          totpCode: totpCodeValidator,
        },
      })
    ) {
      return;
    }

    const user = await UserModel.findOne({
      username: req.body.username.toLowerCase(),
    });

    if (!user) {
      res.status(400).json({
        error: "Invalid username",
      });

      return;
    }

    if (!req.body.authKey) {
      res.json({
        salt: sodium.to_base64(user.salt),
      });

      return;
    }

    if (user.authKey.compare(sodium.from_base64(req.body.authKey))) {
      res.status(400).json({
        error: "Invalid password",
      });

      return;
    }

    if (user.totpSecret) {
      if (!req.body.totpCode) {
        res.json({
          totpRequired: true,
        });

        return;
      }

      if (!checkTotpCode(user.totpSecret, req.body.totpCode)) {
        res.status(400).json({
          error: "Invalid TOTP code",
        });

        return;
      }
    }

    const session = await SessionModel.create({
      userId: user._id,
      ip: req.ip,
      agent: req.headers["user-agent"],
    });

    await dispatchSocket({
      userId: user._id,
      message: {
        t: SocketMessageType.SSessionCreate,
        d: {
          id: sodium.to_base64(session._id),
          ip: session.ip,
          agent: session.agent,
          created: +session.created,
        },
      },
    });

    res.json({
      token: sodium.to_base64(session.token),
      publicKey: sodium.to_base64(user.publicKey),
      encryptedPrivateKey: sodium.to_base64(user.encryptedPrivateKey),
    });
  }
);

app.delete(
  "/",
  async (req: express.Request, res: express.Response): Promise<void> => {
    const session = await authMiddleware(req, res);

    if (!session) {
      return;
    }

    await SessionModel.deleteOne({
      _id: session._id,
    });

    await dispatchSocket({
      sessionId: session._id,
      message: {
        t: SocketMessageType.SReset,
      },
    });

    await dispatchSocket({
      userId: session.userId,
      message: {
        t: SocketMessageType.SSessionDelete,
        d: {
          id: sodium.to_base64(session._id),
        },
      },
    });
  }
);

app.delete(
  "/:sessionId",
  async (req: express.Request, res: express.Response): Promise<void> => {
    const reqSession = await authMiddleware(req, res);

    if (
      !reqSession ||
      !validateMiddleware(req, res, {
        params: {
          sessionId: idValidator.required(),
        },
      })
    ) {
      return;
    }

    const session = await SessionModel.findOneAndDelete({
      _id: Buffer.from(sodium.from_base64(req.params.sessionId)),
      userId: reqSession.userId,
    });

    if (!session) {
      res.status(404).json({
        error: "Invalid session",
      });

      return;
    }

    await dispatchSocket({
      sessionId: session._id,
      message: {
        t: SocketMessageType.SReset,
      },
    });

    await dispatchSocket({
      userId: session.userId,
      message: {
        t: SocketMessageType.SSessionDelete,
        d: {
          id: sodium.to_base64(session._id),
        },
      },
    });
  }
);

export default app;
