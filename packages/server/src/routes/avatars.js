const crypto = require("crypto");
const express = require("express");
const Busboy = require("busboy");
const sharp = require("sharp");
const session = require("../middleware/session");
const user = require("../middleware/user");
const { ObjectId } = require("mongodb");
const app = express.Router();
const ratelimit = require("../middleware/ratelimit");

app.post(
  "/",
  session,
  ratelimit({
    scope: "user",
    tag: "setAvatar",
    max: 5,
    time: 60 * 15,
  }),
  user,
  async (req, res) => {
    const bb = new Busboy({
      headers: req.headers,
    });

    bb.on("file", (name, file) => {
      const bufs = [];

      file.on("data", (b) => {
        bufs.push(b);
      });

      file.on("end", async () => {
        const data = Buffer.concat(bufs);

        if (data.length > 1024 * 1024 * 5) {
          res.status(400).json({
            error: "Avatar too large (5MB max)",
          });
        }

        let img;

        try {
          img = await sharp(data)
            .resize(256, 256)
            .toFormat("webp", {
              quality: 80,
            })
            .toBuffer();
        } catch {
          res.status(400).json({
            error: "Unsupported or invalid image data",
          });

          return;
        }

        const hash = crypto
          .createHash("sha256")
          .update(img)
          .digest();

        let avatar = await req.deps.db.collection("avatars").findOne({
          hash,
        });

        if (!avatar) {
          avatar = (
            await req.deps.db.collection("avatars").insertOne({
              hash,
              img,
            })
          ).ops[0];
        }

        await req.deps.db.collection("users").updateOne(req.user, {
          $set: {
            avatar: avatar._id,
          },
        });

        res.end();

        req.deps.redis.publish(`user:${req.user._id}`, {
          t: "user",
          d: {
            avatar: avatar._id.toString(),
          },
        });

        if (
          !(await req.deps.db.collection("users").findOne({
            avatar: avatar._id,
          }))
        ) {
          await req.deps.db.collection("avatars").deleteOne({
            id: avatar._id,
          });
        }

        //propegate changes to friends
        const friends = await (
          await req.deps.db.collection("friends").find({
            $or: [
              {
                initiator: req.session.user,
              },
              {
                target: req.session.user,
              },
            ],
          })
        ).toArray();

        for (const friend of friends) {
          let userId;

          if (friend.initiator.equals(req.session.user)) {
            userId = friend.target;
          }

          if (friend.target.equals(req.session.user)) {
            userId = friend.initiator;
          }

          await req.deps.redis.publish(`user:${userId}`, {
            t: "friendUser",
            d: {
              friend: friend._id.toString(),
              avatar: avatar._id.toString(),
            },
          });
        }

        //propegate changes to channels
        const channels = await (
          await req.deps.db.collection("channels").find({
            users: {
              $elemMatch: {
                id: req.session.user,
                removed: false,
              },
            },
          })
        ).toArray();

        for (const channel of channels) {
          for (const channelUser of channel.users
            .filter((u) => !u.removed)
            .filter((u) => !u.id.equals(req.session.user))) {
            await req.deps.redis.publish(`user:${channelUser.id}`, {
              t: "channelUser",
              d: {
                channel: channel._id.toString(),
                id: req.session.user.toString(),
                avatar: avatar._id.toString(),
              },
            });
          }
        }
      });
    });

    req.pipe(bb);
  }
);

app.get(
  "/:id",
  ratelimit({
    scope: "ip",
    tag: "getAvatar",
    max: 1000,
    time: 60 * 60,
  }),
  async (req, res) => {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        error: "Invalid avatar",
      });
    }

    const avatar = await req.deps.db.collection("avatars").findOne({
      _id: new ObjectId(req.params.id),
    });

    if (!avatar) {
      res.status(404).end();
      return;
    }

    res.set("content-type", "image/webp");
    res.set("cache-control", "public, max-age=31536000");
    res.send(avatar.img.buffer);
  }
);

module.exports = app;
