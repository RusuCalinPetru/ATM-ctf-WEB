const users = require("../models/userModel");
const teams = require("../models/teamModel");
const challenges = require("../models/challengeModel.js");
const ctfConfig = require("../models/ctfConfigModel.js");
const theme = require("../models/themeModel.js");
const log = require("../models/logModel.js");
const path = require("path");
const fs = require("fs");
const ObjectId = require("mongoose").Types.ObjectId;
const { validateRequestBody } = require("./inputController");
const encryptionController = require("./encryptionController");
const { v4 } = require("uuid");

exports.getStats = async function (req, res) {
  let allChallenges = await challenges.find({}).sort({ points: 1 });

  switch (req.body.name) {
    case "counts":
      let finalObject = {};
      finalObject.usersCount = await users.countDocuments({});
      finalObject.teamsCount = await teams.countDocuments({});
      finalObject.challengesCount = await challenges.countDocuments({});

      res.send(finalObject);
      break;
    case "challenges":
      res.send(allChallenges);
      break;
    case "challenges&tags":
      const tags = (await ctfConfig.findOne({ name: "tags" })).value;

      res.send({
        tags: tags,
        challenges: allChallenges,
        state: "success",
      });
      break;
    default:
      res.send([]);
      break;
  }
};

exports.saveChallenge = async function (req, res) {
  try {
    const challengeExists = await challenges.findById(req.body.id);

    const validationObject = {
      points: { type: "positiveNumber" },
      level: { type: "positiveNumber" },
      firstBloodPoints: { type: "positiveNumber" },
      hints: {
        type: "array",
        itemValidation: {
          cost: { type: "positiveNumber", required: true },
          content: { required: true },
          id: { required: true },
        },
      },
      name: { required: true },
      info: { required: true },
      flag: { required: true },
      requirement: { type: "objectId" },
      tags: { type: "array", itemValidation: {} },
    };

    validateRequestBody(req.body, validationObject);

    if (!challengeExists) throw Error("Challenge-ul nu exista");

    await challenges.findByIdAndUpdate(req.body.id, {
      hidden: req.body.hidden,
      name: req.body.name.trim(),
      tags: JSON.parse(req.body.tags),
      points: JSON.parse(req.body.points),
      firstBloodPoints: JSON.parse(req.body.firstBloodPoints),
      initialPoints: JSON.parse(req.body.points),
      minimumPoints: JSON.parse(req.body.minimumPoints),
      level: JSON.parse(req.body.level),
      info: req.body.info,
      hints: JSON.parse(req.body.hints),
      flag: req.body.flag.trim(),
      file: req.body.file,
      codeSnippet: req.body.codeSnippet,
      githubUrl: req.body.githubUrl.trim(),
      isInstance: JSON.parse(req.body.isInstance),
      codeLanguage: req.body.codeLanguage,
      randomFlag: JSON.parse(req.body.randomFlag),
      requirement: req.body.requirement,
    });
    res.send({ state: "success", message: "Challenge Updatat!" });
  } catch (err) {
    if (err) {
      res.send({ state: "error", message: err.message });
    }
  }
};

exports.createChallenge = async function (req, res) {
  if (req.body.tags.length < 1 || req.body.tags[0].length < 1) {
    res.send({ state: "error", message: "Tags nu poate fi gol" });
    return;
  }

  await challenges.create({
    name: "Challenge_" + Math.random().toString().substr(2, 4),
    tags: req.body.tags,
  });

  res.send({ state: "success", message: "Challenge creat!" });
};

exports.updateChallengeCategory = async function (req, res) {
  const challengeExists = await challenges.findById(req.body.id);

  if (challengeExists) {
    await challenges.findByIdAndUpdate(req.body.id, {
      category: req.body.category,
    });
    res.send({ state: "success", message: "Challenge category schimbat!" });
  } else {
    res.send({ state: "error", message: "Challenge-ul nu exista" });
  }
};

exports.deleteChallenge = async function (req, res) {
  const challengeExists = await challenges.findById(req.body.id);

  if (challengeExists) {
    await challenges.findByIdAndDelete(req.body.id);

    await users.updateMany(
      {
        solved: { $elemMatch: { "challenge._id": challengeExists._id } },
      },
      {
        $pull: { solved: { _id: challengeExists._id } },
        $inc: { score: -challengeExists.points },
      }
    );

    await teams.updateMany(
      {
        users: {
          $elemMatch: {
            solved: { $elemMatch: { "challenge._id": challengeExists._id } },
          },
        },
      },
      {
        $pull: { "users.$.solved": { _id: ObjectId(challengeExists._id) } },
        $inc: { "users.$.score": -challengeExists.points },
      }
    );

    res.send({ state: "success", message: "Challenge sters!" });
  } else {
    res.send({ state: "error", message: "Challenge-ul nu exista!" });
  }
};

exports.getAssets = async function (req, res) {
  const assetsPath = path.join(process.cwd(), "./assets/");

  // Create Assets dir if dosnt exist
  if (!fs.existsSync(assetsPath)) {
    fs.mkdirSync(assetsPath);
  }

  await fs.readdir(assetsPath, function (err, files) {
    //handling error
    if (err) {
      console.log(err);
      res.send([]);
    } else {
      let fileData = [];
      //listing all files using forEach
      files.forEach(function (file) {
        if (file != ".gitignore") {
          fileData.push({
            name: file,
          });
        }
      });
      res.send(fileData);
    }
  });
};

exports.deleteAsset = async function (req, res) {
  const assetsPath = path.join(process.cwd(), "./assets/");

  await fs.unlink(assetsPath + req.body.asset, async (err) => {
    if (err) {
      res.send({ state: "error", message: err.message });
    } else {
      await challenges.updateMany({ file: req.body.asset }, { file: "" });
      res.send({ state: "success" });
    }
  });
};

exports.uploadAsset = async function (req, res) {
  try {
    if (!req.files) {
      res.send({ state: "error", message: "Niciu-un fisier updatat" });
    } else {
      //creare Assets dir daca nu exista
      const dir = path.join(process.cwd(), "./assets/");
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
      }
      let file = req.files.file;
      file.mv("./assets/" + file.name);
      //send response
      res.send({ state: "success", message: "Fisier incarcat!" });
    }
  } catch (err) {
    res.send({ state: "error", message: err.message });
  }
};

exports.saveConfigs = async function (req, res) {
  const newConfigs = req.body.newConfigs;
  let error = false;

  await newConfigs.forEach(async (config) => {
    await ctfConfig.updateOne(
      { name: config.name },
      { value: JSON.parse(config.value) }
    );
  });

  if (!error) {
    res.send({ state: "success" });
  }
};

exports.getUsers = async function (req, res) {
  let page = req.body.page;
  let search = req.body.search;

  if (page <= 0) {
    res.send({ state: "error", message: "Pagina nu poate fi mai mica decat 1!" });
  } else {
    let userCount = await users.count();
    if ((page - 1) * 100 > userCount) {
      res.send({ state: "error", message: "Nu mai exista pagini!" });
    } else {
      if (isNaN(page)) {
        page = 1;
      }

      let allUsers = [];
      try {
        allUsers = await users
          .find({ username: new RegExp(search, "i") }, { password: 0, key: 0 })
          .sort({ score: -1, _id: 1 })
          .skip((page - 1) * 100)
          .limit(100);

        res.send(allUsers);
      } catch (err) {
        res.send({ state: "error", message: err.message });
      }
    }
  }
};

exports.deleteUser = async function (req, res) {
  const user = await users.findById(req.body.user._id);

  if (user) {
    await users.findByIdAndRemove(req.body.user._id);

    if (ObjectId.isValid(user.teamId)) {
      await teams
        .findOneAndUpdate(
          {
            _id: user.teamId,
            users: { $elemMatch: { username: user.username } },
          },
          {
            $pull: {
              users: { username: user.username },
            },
          },
          { returnOriginal: false }
        )
        .then(async function (team) {
          if (team) {
            if (team.users) {
              if (team.users.length <= 0) {
                await teams.findByIdAndRemove(user.teamId);
              }
            }
          }
        });
    }

    res.send({ state: "success" });
  } else {
    res.send({ state: "error", message: "Utilizatorul nu a fost gasit!" });
  }
};

exports.addAdmin = async function (req, res) {
  const user = await users.findById(req.body.user._id);

  if (user) {
    if (!user.isAdmin) {
      await users.findByIdAndUpdate(req.body.user._id, {
        $set: { isAdmin: true },
      });
      res.send({ state: "success" });
    } else {
      res.send({ state: "error", message: "Utilizatorul este deja Admin!" });
    }
  } else {
    res.send({ state: "error", message: "Utilizatorul nu a fost gasit!" });
  }
};

exports.removeAdmin = async function (req, res) {
  const user = await users.findById(req.body.user._id);

  if (user) {
    if (user.isAdmin) {
      await users.findByIdAndUpdate(req.body.user._id, {
        $set: { isAdmin: false },
      });
      res.send({ state: "success" });
    } else {
      res.send({ state: "error", message: "Utilizatorul nu este Admin!" });
    }
  } else {
    res.send({ state: "error", message: "Utilizatorul nu a fost gasit!" });
  }
};

exports.shadowBan = async function (req, res) {
  const user = await users.findById(req.body.user._id);

  if (user) {
    if (!user.shadowBanned) {
      await users.findByIdAndUpdate(req.body.user._id, {
        $set: { shadowBanned: true },
      });

      if (ObjectId.isValid(user.teamId)) {
        await teams.findOneAndUpdate(
          {
            _id: user.teamId,
            users: { $elemMatch: { username: user.username } },
          },
          {
            $set: {
              "users.$.shadowBanned": true,
            },
          }
        );
      }

      res.send({ state: "success" });
    } else {
      res.send({ state: "error", message: "Utilizatorul este deja shadowBanned!" });
    }
  } else {
    res.send({ state: "error", message: "Utilizatorul nu a fost gasit!" });
  }
};

exports.unShadowBan = async function (req, res) {
  const user = await users.findById(req.body.user._id);

  if (user) {
    if (user.shadowBanned) {
      await users.findByIdAndUpdate(req.body.user._id, {
        $set: { shadowBanned: false },
      });

      if (ObjectId.isValid(user.teamId)) {
        await teams.findOneAndUpdate(
          {
            _id: user.teamId,
            users: { $elemMatch: { username: user.username } },
          },
          {
            $set: {
              "users.$.shadowBanned": false,
            },
          }
        );
      }

      res.send({ state: "success" });
    } else {
      res.send({ state: "error", message: "Utilizatorul nu este shadowBanned!" });
    }
  } else {
    res.send({ state: "error", message: "Utilizatorul nu a fost gasit!" });
  }
};

// POINTS TO PENALIZE OR BOOST USERS
exports.setUserAdminPoints = async function (req, res) {
  const user = await users.findById(req.body.user._id);

  if (user) {
    if (isNaN(parseInt(req.body.adminPoints))) {
      res.send({ state: "error", message: "Punctele admin trebuie sa fie un numar!" });
      return;
    }

    await users.findByIdAndUpdate(req.body.user._id, {
      $set: { adminPoints: req.body.adminPoints },
    });

    if (ObjectId.isValid(user.teamId)) {
      await teams.findOneAndUpdate(
        {
          _id: user.teamId,
          users: { $elemMatch: { username: user.username } },
        },
        {
          $set: {
            "users.$.adminPoints": parseInt(req.body.adminPoints),
          },
        }
      );
    }

    res.send({ state: "success" });
  } else {
    res.send({ state: "error", message: "Utilizatorul nu a fost gasit!" });
  }
};

exports.changeUserPassword = async function (req, res) {
  const user = await users.findById(req.body.user._id);

  if (user) {
    // Check password length
    if (req.body.password.trim().length < 8)
      throw new Error("Parola este prea scurta, minim 8 caractere!");

    const password = await encryptionController.encrypt(
      req.body.password.trim()
    );

    const newKey = v4();

    await users.findByIdAndUpdate(req.body.user._id, {
      $set: { password: password, key: newKey.toString() },
    });

    res.send({ state: "success" });
  } else {
    res.send({ state: "error", message: "Utilizatorul nu a fost gasit!" });
  }
};

exports.getTeams = async function (req, res) {
  let page = req.body.page;
  let search = req.body.search;

  if (page <= 0) {
    res.send({ state: "error", message: "Pagina nu poate fi mai mica decat 1!" });
  } else {
    let teamCount = await teams.count();
    if ((page - 1) * 100 > teamCount) {
      res.send({ state: "error", message: "Nu mai exista pagini!" });
    } else {
      if (isNaN(page)) {
        page = 1;
      }

      let allTeams = [];
      try {
        allTeams = await teams
          .find({ name: new RegExp(search, "i") })
          .skip((page - 1) * 100)
          .limit(100);

        res.send(allTeams);
      } catch (err) {
        res.send({ state: "error", message: err.message });
      }
    }
  }
};

exports.deleteTeam = async function (req, res) {
  const team = await teams.findById(req.body.team._id);

  if (team) {
    await teams.findByIdAndRemove(req.body.team._id);
    res.send({ state: "success" });
  } else {
    res.send({ state: "error", message: "Echipa nu a fost gasita!" });
  }
};

exports.saveTheme = async function (req, res) {
  const currentTheme = await theme.findOne({});

  if (currentTheme) {
    await theme.findOneAndUpdate(
      {},
      {
        color_1: req.body.color_1,
        color_2: req.body.color_2,
        bg_img: req.body.bg_img.trim(),
        top1_icon: req.body.top1_icon,
        top2_icon: req.body.top2_icon,
        top3_icon: req.body.top3_icon,
      }
    );
    res.send({ state: "success" });
  } else {
    res.send({ state: "error", message: "Nu a fost gasita nicio tema!" });
  }
};

exports.sendGlobalMessage = async function (req, res) {
  const currentNotifications = await ctfConfig.findOne({
    name: "notifications",
  });

  if (currentNotifications) {
    await ctfConfig.findOneAndUpdate(
      { name: "notifications" },
      {
        value: [
          ...currentNotifications.value,
          ...[
            {
              message: "ADMIN : " + req.body.globalMessage,
              type: "admin",
              seenBy: [],
            },
          ],
        ],
      }
    );
    res.send({ state: "success" });
  } else {
    res.send({ state: "error", message: "Tabelul de notificari nu a fost gasit!" });
  }
};

exports.getLogs = async function (req, res) {
  let search = req.body.search;
  let page = req.body.page;

  try {
    if (page <= 0) throw Error("Pagina nu poate fi mai mica decat 1!");
    let logCount = await log.count();
    if ((page - 1) * 100 > logCount) throw Error("Nu mai exista pagini!");
    if (isNaN(page)) page = 1;

    const logs = await log
      .find({
        $or: [
          { authorIp: new RegExp(search, "i") },
          { authorId: new RegExp(search, "i") },
          { authorName: new RegExp(search, "i") },
          { function: new RegExp(search, "i") },
          { result: new RegExp(search, "i") },
        ],
      })
      .skip((page - 1) * 100)
      .limit(100);
    res.send(logs);
  } catch (e) {
    res.send({ state: "error", message: e.message });
  }
};

exports.getDockers = async function (req, res) {
  let search = req.body.search;
  let page = req.body.page;

  try {
    if (page <= 0) throw Error("Pagina nu poate fi mai mica decat 1!");
    let logCount = await log.count();
    if ((page - 1) * 100 > logCount) throw Error("Nu mai exista pagini!");
    if (isNaN(page)) page = 1;

    let dockers = (
      await (
        await fetch(`${process.env.DEPLOYER_API}/api/getAllDockers`, {
          method: "POST",
          headers: {
            "X-API-KEY": process.env.DEPLOYER_SECRET,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            page: page,
          }),
        })
      ).json()
    ).dockers;

    dockers = await Promise.all(
      dockers.map(async (x) => {
        x.team = (await teams.findById(x.ownerId, { name: 1 })) || {
          name: "Echipa Stearsa",
        };
        x.challenge = (await challenges.findById(x.challengeId, {
          name: 1,
        })) || { name: "Challenge Sters" };
        if (
          new RegExp(search).test(x.team.name) ||
          new RegExp(search).test(x.challenge.name) ||
          new RegExp(search).test(x.randomFlag) ||
          new RegExp(search).test(x.mappedPort)
        )
          return x;
      })
    );

    dockers = dockers.filter((x) => x !== undefined);

    res.send(dockers);
  } catch (e) {
    res.send({ state: "error", message: e.message });
  }
};

exports.restartDocker = async function (req, res) {
  try {
    const dockerToRestart = req.body.docker;

    let resFetch = await (
      await fetch(`${process.env.DEPLOYER_API}/api/shutdownDocker`, {
        method: "POST",
        headers: {
          "X-API-KEY": process.env.DEPLOYER_SECRET,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ownerId: dockerToRestart.ownerId,
          challengeId: dockerToRestart.challengeId,
        }),
      })
    ).json();

    if (resFetch.state == "error") throw new Error(resFetch.message);

    resFetch = await (
      await fetch(`${process.env.DEPLOYER_API}/api/deployDocker`, {
        method: "POST",
        headers: {
          "X-API-KEY": process.env.DEPLOYER_SECRET,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          githubUrl: dockerToRestart.githubUrl,
          ownerId: dockerToRestart.ownerId,
          challengeId: dockerToRestart.challengeId,
          randomFlag: dockerToRestart.randomFlag != "false" ? true : false,
        }),
      })
    ).json();

    if (resFetch.state == "error") throw new Error(resFetch.message);

    const challenge = await challenges.findById(dockerToRestart.challengeId);
    if (challenge && challenge.randomFlag) {
      if (challenge.randomFlags.find((x) => x.id == dockerToRestart.ownerId)) {
        await challenges.updateOne(
          { id: challenge._id },
          {
            $pull: {
              randomFlags: { id: dockerToRestart.ownerId },
            },
          }
        );
      }

      await challenges.updateOne(
        { id: challenge._id },
        {
          $push: {
            randomFlags: {
              id: dockerToRestart.ownerId,
              flag: resFetch.flag,
            },
          },
        }
      );
      //COMBINE PULL & PUSH
    }

    res.send({ state: "success", message: "Docker repornit!" });
  } catch (error) {
    if (error.response?.data?.message)
      return res.send({ state: "error", message: error.response.data.message });
    res.send({ state: "error", message: error.message });
  }
};

exports.shutdownDocker = async function (req, res) {
  try {
    const dockerToStop = req.body.docker;

    const resFetch = await (
      await fetch(`${process.env.DEPLOYER_API}/api/shutdownDocker`, {
        method: "POST",
        headers: {
          "X-API-KEY": process.env.DEPLOYER_SECRET,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ownerId: dockerToStop.ownerId,
          challengeId: dockerToStop.challengeId,
        }),
      })
    ).json();

    if (resFetch.state == "error") throw new Error(resFetch.message);

    const challenge = await challenges.findById(dockerToStop.challengeId);
    if (challenge && challenge.randomFlag) {
      await challenges.updateOne(
        { id: challenge._id },
        {
          $pull: {
            randomFlags: { id: dockerToStop.ownerId },
          },
        }
      );
    }

    res.send({ state: "success", message: "Docker oprit!" });
  } catch (error) {
    if (error.response?.data?.message)
      return res.send({ state: "error", message: error.response.data.message });
    res.send({ state: "error", message: error.message });
  }
};