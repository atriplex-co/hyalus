import express from "express";
import { avatarIdValidator, validateMiddleware } from "../util";
import sodium from "libsodium-wrappers";
import Joi from "joi";
import { AvatarType } from "common/src";
import { AvatarModel, IAvatarVersion } from "../models/avatar";

const app = express.Router();

app.get(
  "/:avatarId/:type?",
  async (req: express.Request, res: express.Response): Promise<void> => {
    if (
      !validateMiddleware(req, res, {
        params: {
          avatarId: avatarIdValidator.required(),
          type: Joi.number().valid(AvatarType.WEBP, AvatarType.MP4),
        },
      })
    ) {
      return;
    }

    const avatar = await AvatarModel.findOne({
      _id: Buffer.from(sodium.from_base64(req.params.avatarId)),
    });

    if (!avatar) {
      res.status(404).json({
        error: "Invalid avatar",
      });

      return;
    }

    let version: IAvatarVersion | undefined = avatar.versions[0];

    if (req.params.type) {
      version = avatar.versions.find(
        (version) => version.type === +req.params.type
      );
    }

    if (!version) {
      res.status(404).json({
        error: "Invalid avatar version",
      });

      return;
    }

    res.setHeader("cache-control", "public, max-age=31536000");
    res.setHeader(
      "content-type",
      {
        [AvatarType.WEBP]: "image/webp",
        [AvatarType.MP4]: "video/mp4",
      }[version.type]
    );
    res.send(version.data);
  }
);

export default app;
