const { validationResult, matchedData } = require("express-validator");
const challenges = require("../models/challengeModel");
const users = require("../models/userModel");
const teams = require("../models/teamModel");
const ctfConfig = require("../models/ctfConfigModel.js");
const logController = require("./logController");
const ObjectId = require("mongoose").Types.ObjectId;
const { Webhook } = require("discord-webhook-node");

let hook;
if ("WEBHOOK" in process.env) {
  hook = new Webhook(process.env.WEBHOOK);
  const IMAGE_URL = "https://cdn-icons-png.flaticon.com/512/205/205916.png";
  hook.setUsername("First Blood");
  hook.setAvatar(IMAGE_URL);
}

let hook_2;
if ("WEBHOOK_2" in process.env) {
  hook_2 = new Webhook(process.env.WEBHOOK_2);
  const IMAGE_URL = "https://cdn-icons-png.flaticon.com/512/205/205916.png";
  hook_2.setUsername("First Blood");
  hook_2.setAvatar(IMAGE_URL);
}

exports.getChallenges = async function (req, res) {
  let allChallenges = await challenges
    .find(
      { hidden: false },
      {
        name: 1,
        tags: 1,
        hints: 1,
        points: 1,
        firstBloodPoints: 1,
        info: 1,
        level: 1,
        solveCount: 1,
        file: 1,
        codeSnippet: 1,
        codeLanguage: 1,
        firstBlood: 1,
        isInstance: 1,
        requirement: 1,
        randomFlag: 1,
      }
    )
    .sort({ points: 1 });
  const startTime = await ctfConfig.findOne({ name: "startTime" });
  const endTime = await ctfConfig.findOne({ name: "endTime" });
  let tags = [];

  if (parseInt(startTime.value) - Math.floor(new Date().getTime()) >= 0) {
    res.send({
      state: "error",
      message: "CTF-ul nu a inceput inca!",
      startTime: startTime.value,
    });
  } else {
    users
      .findById(req.session.userId)
      .then(async (user) => {
        const deployed = await getDocker(user.teamId);
        let returnedChallenges = [];

        for (let i = 0; i < allChallenges.length; i++) {
          const challenge = allChallenges[i];
          let copy = { ...challenge._doc, id: challenge.id };

          let team = false;

          //check teamId is valid
          if (ObjectId.isValid(user.teamId)) {
            team = await teams.findById(user.teamId);
          }
          if (ObjectId.isValid(challenge.requirement)) {
            //check chall unlocked by team
            let teamHasUnlocked = false;
            if (team) {
              //check if hint bought by team
              if (
                team.users.filter((user) =>
                  user.solved.find((x) =>
                    new ObjectId(x._id).equals(challenge.requirement)
                  )
                ).length > 0
              ) {
                teamHasUnlocked = true;
              }
            }

            if (
              !user.solved.find((x) =>
                new ObjectId(x._id).equals(challenge.requirement)
              ) &&
              teamHasUnlocked == false
            ) {
              continue;
            }
          }

          copy.hints = challenge.hints.map((hint) => {
            let teamHasBought = false;
            hintCopy = { ...hint };
            //exista echipa
            if (team) {
              //daca hintul a fost cumparat de catre un membru al echipei
              if (
                team.users.filter((user) =>
                  user.hintsBought.find(
                    (x) =>
                      challenge._id.equals(x.challId) &&
                      parseInt(x.hintId) == parseInt(hint.id)
                  )
                ).length > 0
              ) {
                teamHasBought = true;
              }
            }

            //show hint if bought
            if (
              !user.hintsBought.find(
                (x) =>
                  challenge._id.equals(x.challId) &&
                  parseInt(x.hintId) == parseInt(hint.id)
              ) &&
              hint.cost > 0 &&
              teamHasBought == false
            ) {
              hintCopy.content = "";
            } else {
              hintCopy.cost = 0;
            }

            return hintCopy;
          });

          let challengeDeployed = deployed.find(
            (d) => d.challengeId == copy.id
          );
          if (challengeDeployed) {
            if (!challengeDeployed.progress) {
              copy.url = challengeDeployed.url;
              copy.progress = "finished";
            } else {
              copy.progress = challengeDeployed.progress;
            }
            copy.deployTime = challengeDeployed.deployTime;
          }

          delete copy.flag;
          delete copy.githubUrl;
          copy.tags.forEach((tag) => {
            if (tags.indexOf(tag) == -1) tags.push(tag);
          });

          returnedChallenges.push(copy);
        }

        res.send({
          tags: tags,
          challenges: returnedChallenges,
          endTime: endTime.value,
        });
      })
      .catch((err) => {
        console.log(err);
        res.send({ state: "error", message: err });
      });
  }
};

let currentlyDeployingUsers = [];
let currentlyDeployingTeams = [];
exports.deployDocker = async function (req, res) {
  let teamId = undefined;
  try {
    const result = validationResult(req);

    if (!result.isEmpty()) {
      throw new Error(`${result.errors[0].path}: ${result.errors[0].msg}`);
    }

    const data = matchedData(req);

    const user = await users.findById(req.session.userId);
    if (!user) throw new Error("Utilizatorul nu a fost gasit");

    //check if user is currently submitting flag
    if (currentlyDeployingUsers.includes(req.session.userId))
      throw new Error("Trimiti prea rapid!");

    currentlyDeployingUsers.push(req.session.userId);

    if (!ObjectId.isValid(user.teamId)) throw new Error("Nu esti intr-o echipa!");

    //check if team is currently submitting
    if (currentlyDeployingTeams.includes(user.teamId)) {
      throw new Error("Trimiti prea rapid!");
    }

    currentlyDeployingTeams.push(user.teamId);
    teamId = user.teamId;

    const team = await teams.findById(user.teamId);
    if (!team) throw new Error("Nu esti intr-o echipa!");

    const startTime = await ctfConfig.findOne({ name: "startTime" });
    if (parseInt(startTime.value) - Math.floor(new Date().getTime()) >= 0)
      throw new Error("CTF-ul nu a inceput inca!");

    const challenge = await challenges.findById(data.challengeId);

    if (!challenge) throw new Error("Provocarea nu exista!");
    if (!challenge.isInstance) throw new Error("Provocarea nu este o instanta!");
    if (!challenge.githubUrl)
      throw new Error("Provocarea nu are un URL GitHub!");

    //check Team Docker Limit
    const dockerLimit = await ctfConfig.findOne({ name: "dockerLimit" });
    const deployed = await getDocker(user.teamId);
    if (deployed.length >= dockerLimit.value)
      throw new Error("Limita de containere Docker a fost atinsa!");

    const resFetch = await await (
      await fetch(`${process.env.DEPLOYER_API}/api/deployDocker`, {
        method: "POST",
        headers: {
          "X-API-KEY": process.env.DEPLOYER_SECRET,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          githubUrl: challenge.githubUrl,
          ownerId: user.teamId,
          challengeId: challenge.id,
          randomFlag: challenge.randomFlag,
        }),
      })
    ).json();

    if (resFetch.state == "error") throw new Error(resFetch.message);

    if (challenge.randomFlag) {
      if (challenge.randomFlags.find((x) => x.id == user.teamId)) {
        await challenges.updateOne(
          { id: challenge._id },
          {
            $pull: {
              randomFlags: { id: user.teamId },
            },
          }
        );
      }

      await challenges.updateOne(
        { id: challenge._id },
        {
          $push: {
            randomFlags: { id: user.teamId, flag: resFetch.flag },
          },
        }
      );
    }

    delete resFetch.flag;
    res.send({ state: "success", message: resFetch });
  } catch (error) {
    if (error) {
      res.send({ state: "error", message: error.message });
    }
  } finally {
    currentlyDeployingUsers = currentlyDeployingUsers.filter(
      (item) => item !== req.session.userId
    );

    if (teamId) {
      currentlyDeployingTeams = currentlyDeployingTeams.filter(
        (item) => item !== teamId
      );
    }
  }
};

exports.shutdownDocker = async function (req, res) {
  try {
    const result = validationResult(req);

    if (!result.isEmpty()) {
      throw new Error(`${result.errors[0].path}: ${result.errors[0].msg}`);
    }

    const data = matchedData(req);

    const user = await users.findById(req.session.userId);
    if (!user) throw new Error("Utilizatorul nu a fost gasit");
    if (!ObjectId.isValid(user.teamId)) throw new Error("Nu esti intr-o echipa!");

    const team = await teams.findById(user.teamId);
    if (!team) throw new Error("Nu esti intr-o echipa!");

    const challenge = await challenges.findById(data.challengeId);

    if (!challenge) throw new Error("Provocarea nu exista!");
    if (!challenge.isInstance) throw new Error("Provocarea nu este o instanta!");
    if (!challenge.githubUrl)
      throw new Error("Provocarea nu are un URL GitHub!");

    const resFetch = await (
      await fetch(`${process.env.DEPLOYER_API}/api/shutdownDocker`, {
        method: "POST",
        headers: {
          "X-API-KEY": process.env.DEPLOYER_SECRET,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ownerId: user.teamId,
          challengeId: challenge.id,
        }),
      })
    ).json();

    if (resFetch.state == "error") throw new Error(resFetch.message);

    if (challenge.randomFlag) {
      await challenges.updateOne(
        { id: challenge._id },
        {
          $pull: {
            randomFlags: { id: user.teamId },
          },
        }
      );
    }

    res.send({ state: "success", message: resFetch });
  } catch (err) {
    if (err) res.send({ state: "error", message: err.message });
  }
};

async function getDocker(teamId) {
  try {
    const deployed = await (
      await fetch(`${process.env.DEPLOYER_API}/api/getDockers`, {
        method: "POST",
        headers: {
          "X-API-KEY": process.env.DEPLOYER_SECRET,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ownerId: teamId,
        }),
      })
    ).json();

    return deployed.dockers.map((c) => {
      delete c.githubUrl;
      return c;
    });
  } catch (error) {
    return [];
  }
}

let currentlySubmittingUsers = [];
let currentlySubmittingTeams = [];
exports.submitFlag = async function (req, res) {
  let teamId = undefined;
  try {
    const result = validationResult(req);

    if (!result.isEmpty()) {
      throw new Error(`${result.errors[0].path}: ${result.errors[0].msg}`);
    }

    const data = matchedData(req);

    const flag = data.flag;
    const challengeId = data.challengeId;

    //check if user is currently submitting flag
    if (currentlySubmittingUsers.includes(req.session.userId))
      throw new Error("Trimiti prea rapid!");

    currentlySubmittingUsers.push(req.session.userId);

    const endTime = await ctfConfig.findOne({ name: "endTime" });
    const startTime = await ctfConfig.findOne({ name: "startTime" });

    if (parseInt(endTime.value) - Math.floor(new Date().getTime()) <= 0)
      throw new Error("CTF-ul s-a terminat!");
    else if (parseInt(startTime.value) - Math.floor(new Date().getTime()) >= 0)
      throw new Error("CTF-ul nu a inceput inca!");

    const userId = req.session.userId;
    const user = await users.findOne({ _id: userId, verified: true });

    //check if user exists
    if (!user) throw new Error("Nu esti autentificat!");

    let challenge = await challenges.findById(challengeId);

    //check random flag
    if (challenge.randomFlag) {
      if (
        challenge.randomFlags.find((obj) => obj.id == user.teamId).flag != flag
      ) {
        logController.createLog(req, user, {
          state: "error",
          message: "Flag gresit :( " + flag,
        });
        throw new Error("Flag gresit :(");
      }
    } else 
    { //check flag
      if (!(challenge.flag === flag)) {
        logController.createLog(req, user, {
          state: "error",
          message: "Flag gresit, Incearca mai mult:( " + flag,
        });
        throw new Error("Flag gresit :(");
      }
    }

    challenge.flag = "Nice try XD(icsde)";

    // Check if challenge is already solved
    if (
      user.solved.filter((obj) => {
        return obj._id.equals(challenge._id);
      }).length > 0
    )
      throw new Error("Provocare deja rezolvata!");

    //check teamId is valid
    if (!ObjectId.isValid(user.teamId)) throw new Error("Nu esti intr-o echipa!");

    const team = await teams.findById(user.teamId);

    //check Team Exists
    if (!team) throw new Error("Nu esti intr-o echipa!");

    //check if team is currently submitting
    if (currentlySubmittingTeams.includes(user.teamId)) {
      logController.createLog(req, user, {
        state: "error",
        message: "Trimiti prea rapid!",
      });
      throw new Error("Trimiti prea rapid!");
    }

    currentlySubmittingTeams.push(user.teamId);
    teamId = user.teamId;

    if (
      team.users.filter((user) => {
        return (
          user.solved.filter((obj) => {
            return obj._id.equals(challenge._id);
          }).length > 0
        );
      }).length > 0
    ) {
      throw new Error("Provocare deja rezolvata!");
    }

    let timestamp = new Date().getTime();

    if (challenge.firstBlood == "none") challenge.firstBlood = user._id;

    const dynamicScoring = await ctfConfig.findOne({ name: "dynamicScoring" });
    //formula de calculare a punctajului
    if (dynamicScoring.value.toString() == "true") {
      const decay = (await teams.countDocuments()) * 0.75;
      let dynamicPoints = Math.ceil(
        ((challenge.minimumPoints - challenge.initialPoints) /
          (decay ** 2 + 1)) *
          (challenge.solveCount + 1) ** 2 +
          challenge.initialPoints
      );
      if (dynamicPoints < challenge.minimumPoints) {
        dynamicPoints = challenge.minimumPoints;
      }

      await challenges.updateOne(
        { _id: challengeId },
        { $set: { points: dynamicPoints } }
      );
      challenge = await challenges.findById(challengeId);
    }

    await users.updateOne(
      { _id: userId, verified: true },
      { $push: { solved: { _id: challenge._id, timestamp: timestamp } } }
    );

    const updatedUser = await users.findOne({
      _id: userId,
      verified: true,
    });

    await teams.updateOne(
      {
        _id: team._id,
        users: { $elemMatch: { _id: updatedUser._id } },
      },
      {
        $set: {
          "users.$.solved": updatedUser.solved,
        },
      }
    );

    if ( challenge.firstBlood == "none" || user._id.equals(challenge.firstBlood)) {
      await challenges.updateOne(
        { _id: challengeId },
        { $inc: { solveCount: 1 }, firstBlood: updatedUser._id }
      );

      if ("WEBHOOK" in process.env) {
        // DISCORD WEBHOOK FIRST BLOOD todo!!
        hook.send(
          `:drop_of_blood: ${user.username}@${team.name} has firstBlood ${challenge.name}`
        );
      }

      if ("WEBHOOK_2" in process.env) {
        // DISCORD WEBHOOK FIRST BLOOD todo!!
        hook_2.send(
          `:drop_of_blood: ${user.username}@${team.name} has firstBlood ${challenge.name}`
        );
      }

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
                  message: `${updatedUser.username}@${team.name} has first blood ${challenge.name}!`,
                  type: "first_blood",
                  seenBy: [],
                },
              ],
            ],
          }
        );
      }
    } else {
      await challenges.updateOne(
        { _id: challengeId },
        { $inc: { solveCount: 1 } }
      );
    }

    logController.createLog(req, updatedUser, {
      state: "success",
    });

    res.send({ state: "success" });
  } catch (err) {
    if (err) {
      res.send({ state: "error", message: err.message });
    }
  } finally {
    currentlySubmittingUsers = currentlySubmittingUsers.filter(
      (item) => item !== req.session.userId
    );

    if (teamId) {
      currentlySubmittingTeams = currentlySubmittingTeams.filter(
        (item) => item !== teamId
      );
    }
  }
};

let currentlyBuyingUsers = [];
let currentlyBuyingTeams = [];
exports.buyHint = async function (req, res) {
  let teamId = undefined;
  try {
    const result = validationResult(req);

    if (!result.isEmpty()) {
      throw new Error(`${result.errors[0].path}: ${result.errors[0].msg}`);
    }

    const data = matchedData(req);

    const challengeId = data.challengeId;
    const hintId = req.body.hintId;

    //check if user is currently submitting flag
    if (currentlyBuyingUsers.includes(req.session.userId))
      throw new Error("Trimiti prea rapid!");

    currentlyBuyingUsers.push(req.session.userId);

    const endTime = await ctfConfig.findOne({ name: "endTime" });
    const startTime = await ctfConfig.findOne({ name: "startTime" });

    if (parseInt(endTime.value) - Math.floor(new Date().getTime()) <= 0)
      throw new Error("CTF-ul s-a terminat!");
    else if (parseInt(startTime.value) - Math.floor(new Date().getTime()) >= 0)
      throw new Error("CTF-ul nu a inceput inca!");

    //get specified challenge
    let challenge = await challenges.findById(challengeId);

    //check challenge has hint to be bought
    const hint = challenge.hints.find((x) => x.id == hintId);
    if (!hint) throw new Error("Indiciul nu exista!");
    if (hint.cost <= 0) throw new Error("Indiciul provocarii este gratuit!");

    const user = await users.findOne({
      _id: req.session.userId,
      verified: true,
    });

    //check user already bought hint
    if (
      user.hintsBought.find(
        (x) =>
          challenge._id.equals(x.challId) &&
          parseInt(x.hintId) == parseInt(hint.id)
      )
    )
      throw new Error("Indiciul provocarii a fost deja cumparat!");

    //check teamId is valid
    if (!ObjectId.isValid(user.teamId)) throw new Error("Nu esti intr-o echipa!");

    const team = await teams.findById(user.teamId);

    //check Team Exists
    if (!team) throw new Error("Nu esti intr-o echipa!");

    //check if team is currently submitting
    if (currentlyBuyingTeams.includes(user.teamId)) {
      logController.createLog(req, user, {
        state: "error",
        message: "Trimiti prea rapid!",
      });
      throw new Error("Trimiti prea rapid!");
    }

    currentlyBuyingTeams.push(user.teamId);
    teamId = user.teamId;

    //check Team bought Hint
    if (
      team.users.filter((user) =>
        user.hintsBought.find(
          (x) =>
            challenge._id.equals(x.challId) &&
            parseInt(x.hintId) == parseInt(hint.id)
        )
      ).length > 0
    )
      throw new Error("Indiciul a fost deja cumparat!");

    for (let i = 0; i < user.solved.length; i++) {
      let challenge = await challenges.findById(user.solved[i]._id);
      if (challenge) {
        user.solved[i].challenge = challenge;
        user.score += challenge.points;
      }
    }

    // Check User has enough points
    if (user.score < hint.cost) throw new Error("Nu ai suficiente puncte!");

    let timestamp = new Date().getTime();
    await users.updateOne(
      { _id: req.session.userId, verified: true },
      {
        $push: {
          hintsBought: {
            challId: challenge._id,
            hintId: hint.id,
            cost: hint.cost,
            timestamp: timestamp,
          },
        },
      }
    );

    const updatedUser = await users.findOne({
      _id: req.session.userId,
      verified: true,
    });

    await teams.updateOne(
      {
        _id: team._id,
        users: { $elemMatch: { _id: updatedUser._id } },
      },
      {
        $set: {
          "users.$.hintsBought": updatedUser.hintsBought,
        },
      }
    );

    logController.createLog(req, updatedUser, {
      state: "success",
      hint: hint,
    });

    res.send({ state: "success", hint: hint });
  } catch (err) {
    if (err) {
      res.send({ state: "error", message: err.message });
    }
  } finally {
    currentlyBuyingUsers = currentlyBuyingUsers.filter(
      (item) => item !== req.session.userId
    );

    if (teamId) {
      currentlyBuyingTeams = currentlyBuyingTeams.filter(
        (item) => item !== teamId
      );
    }
  }
};