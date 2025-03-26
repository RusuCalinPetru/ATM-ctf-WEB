const { validationResult, matchedData } = require("express-validator");
const teams = require("../models/teamModel");
const users = require("../models/userModel");
const { v4 } = require("uuid");
const ObjectId = require("mongoose").Types.ObjectId;
const dbController = require("./dbController");
const ctfConfig = require("../models/ctfConfigModel");
//control pe managementul echipelor 
exports.registerTeam = async function (req, res) {
  try {
    const result = validationResult(req);

    if (!result.isEmpty()) {
      throw new Error(`${result.errors[0].path}: ${result.errors[0].msg}`);
    }

    const data = matchedData(req);

    const teamName = data.teamName;

    const teamNameExists = await teams.findOne({ name: teamName });

    if (teamNameExists) {
      throw new Error("Numele echipei exista deja!");
    }

    const userToCheck = await users.findOne({
      _id: req.session.userId,
      verified: true,
    });

    let userTeamExists;
    if (ObjectId.isValid(userToCheck.teamId)) {
      userTeamExists = await teams.findById(userToCheck.teamId);
    }

    if (userTeamExists) {
      throw new Error("Esti deja intr-o echipa!");
    }

    await teams
      .create({
        name: teamName,
        inviteCode: v4(),
        teamCaptain: userToCheck._id,
        category: userToCheck.category,
        users: [
          {
            _id: userToCheck._id,
            username: userToCheck.username,
            score: userToCheck.score,
            solved: userToCheck.solved,
            hintsBought: userToCheck.hintsBought,
            shadowBanned: userToCheck.shadowBanned,
            adminPoints: userToCheck.adminPoints,
          },
        ],
      })
      .then(async function (team) {
        await users
          .findOneAndUpdate(
            { _id: req.session.userId, verified: true },
            { teamId: team.id },
            { returnOriginal: false }
          )
          .then(async function (user) {
            res.send({
              state: "success",
              message: "Echipa inregistrata!",
            });
          });
      })
      .catch(function (err) {
        console.log(err);
        throw new Error("Crearea echipei a esuat!");
      });
  } catch (err) {
    if (err) {
      res.send({ state: "error", message: err.message });
    }
  }
};

exports.getCode = async function (req, res) {
  try {
    const result = validationResult(req);

    if (!result.isEmpty()) {
      throw new Error(`${result.errors[0].path}: ${result.errors[0].msg}`);
    }

    const data = matchedData(req);

    const teamName = data.teamName;

    const teamNameExists = await teams.findOne({ name: teamName });

    if (!teamNameExists) {
      throw new Error("Echipa nu exista!");
    }

    const userHasTeam = await users.findOne({
      _id: req.session.userId,
      verified: true,
    });

    if (userHasTeam.teamId == teamNameExists.id) {
      res.send({ state: "success", code: teamNameExists.inviteCode });
    } else {
      throw new Error("Nu faci parte din aceasta echipa!");
    }
  } catch (err) {
    if (err) {
      res.send({ state: "error", message: err.message });
    }
  }
};

exports.joinTeam = async function (req, res) {
  try {
    const result = validationResult(req);

    if (!result.isEmpty()) {
      throw new Error(`${result.errors[0].path}: ${result.errors[0].msg}`);
    }

    const data = matchedData(req);

    const teamCode = data.teamCode;

    //check the code is valid
    const teamCodeExists = await teams.findOne({ inviteCode: teamCode });

    if (!teamCodeExists) {
      throw new Error("Codul echipei este invalid!");
    }

    const userToCheck = await users.findOne({
      _id: req.session.userId,
      verified: true,
    });

    //check if user in team
    let userTeamExists;
    if (ObjectId.isValid(userToCheck.teamId)) {
      userTeamExists = await teams.findById(userToCheck.teamId);
    }

    if (userTeamExists) {
      throw new Error("Esti deja intr-o echipa!");
    }

    //check team is not full
    if (teamCodeExists.users.length >= 4) {
      throw new Error("Echipa este completa!");
    }

    //check Team Category matches user
    if (teamCodeExists.category !== userToCheck.category) {
      throw new Error("Echipa si utilizatorul nu sunt in aceeasi categorie!");
    }

    //check solve conflicts
    conflict = false;
    teamCodeExists.users.map((teamUser) => {
      teamUser.solved.map((x) => {
        if (userToCheck.solved.find((y) => new ObjectId(y._id).equals(x._id))) {
          conflict = true;
        }
      });
    });

    if (conflict) {
      throw new Error("Exista conflicte de rezolvare intre echipa si utilizator!");
    }

    
    await teams
      .findOneAndUpdate(
        { inviteCode: teamCode },
        {
          $push: {
            users: {
              _id: userToCheck._id,
              username: userToCheck.username,
              score: userToCheck.score,
              solved: userToCheck.solved,
              hintsBought: userToCheck.hintsBought,
              shadowBanned: userToCheck.shadowBanned,
              adminPoints: userToCheck.adminPoints,
            },
          },
        },
        { returnOriginal: false }
      )
      .then(async function (team) {
        await users
          .findOneAndUpdate(
            { _id: req.session.userId, verified: true },
            { teamId: team.id },
            { returnOriginal: false }
          )
          .then(async function (user) {
            res.send({
              state: "success",
              message: "Te-ai alaturat echipei!",
            });
          });
      })
      .catch((error) => {
        console.log(error);
        throw new Error("Alaturarea la echipa a esuat!");
      });
  } catch (err) {
    if (err) {
      res.send({ state: "error", message: err.message });
    }
  }
};

exports.getTeams = async function (req, res) {
  try {
    const result = validationResult(req);

    if (!result.isEmpty()) {
      throw new Error(`${result.errors[0].path}: ${result.errors[0].msg}`);
    }

    const data = matchedData(req);

    let page = data.page;
    let search = data.search;
    let userCategory = req.body.category;

    const userToCheck = await users.findById(req.session.userId);
    if (!userToCheck || !userToCheck.isAdmin) {
      //DONT SEND TEAMS IF SCOREBOARD HIDDEN AND NOT ADMIN
      const scoreboardHidden = await ctfConfig.findOne({
        name: "scoreboardHidden",
      });
      if (scoreboardHidden.value) {
        throw new Error("Clasamentul este ascuns!");
      }
    }

    const userCategories = (await ctfConfig.findOne({ name: "userCategories" }))
      .value;

    if (userCategory && !userCategories.find((x) => x === userCategory))
      throw new Error("Categoria de utilizator nu exista!");

    let teamCount = await teams.count();
    if ((page - 1) * 100 > teamCount) {
      throw new Error("Nu mai exista pagini!");
    }

    let allTeams = [];
    allTeams = await dbController
      .resolveTeamsMin({
        category: userCategory ? userCategory : { $exists: true },
        name: new RegExp(search, "i"),
        $or: [
          {
            users: {
              $elemMatch: { _id: req.session.userId },
            },
          },
          {
            users: {
              $not: {
                $elemMatch: { shadowBanned: true },
              },
            },
          },
        ],
      })
      .sort({ totalScore: -1, maxTimestamp: 1, _id: 1 })
      .skip((page - 1) * 100)
      .limit(100);

    res.send(allTeams);
  } catch (err) {
    if (err) {
      res.send({ state: "error", message: err.message });
    }
  }
};

exports.getUserTeam = async function (req, res) {
  try {
    const user = await users.findById(req.session.userId);

    if (user.teamId == "none") {
      throw new Error("Nu faci parte din nicio echipa!");
    }

    const team = await dbController.resolveTeamsFull({
      _id: new ObjectId(user.teamId),
    });

    if (!team[0]) {
      throw new Error("Nu faci parte din nicio echipa!");
    }

    if (!team[0].users.find((x) => x._id.equals(req.session.userId))) {
      throw new Error("Nu faci parte din aceasta echipa!");
    }

    res.send(team[0]);
  } catch (err) {
    if (err) {
      res.send({ state: "error", message: err.message });
    }
  }
};

exports.leaveTeam = async function (req, res) {
  const userToCheck = await users.findOne({
    _id: req.session.userId,
    verified: true,
  });

  let userTeamExists;
  if (ObjectId.isValid(userToCheck.teamId)) {
    userTeamExists = await teams.findById(userToCheck.teamId);
  }

  if (userTeamExists) {
    let newTeamUsers = userTeamExists.users.filter(
      (user) => !user._id.equals(userToCheck._id)
    );
    await teams
      .findOneAndUpdate(
        { _id: userTeamExists.id },
        { $set: { users: newTeamUsers } },
        { returnOriginal: false }
      )
      .then(async function (team) {
        await users
          .findOneAndUpdate(
            { _id: req.session.userId, verified: true },
            { teamId: "none" },
            { returnOriginal: false }
          )
          .then(async function (user) {
            if (team.users) {
              if (team.users.length <= 0) {
                await teams.findByIdAndRemove(team.id);
              }
            }

            res.send({
              state: "success",
              message: "Ai parasit echipa!",
            });
          });
      });
  } else {
    res.send({ state: "error", message: "Nu faci parte din nicio echipa!" });
  }
};

exports.getTeam = async function (req, res) {
  try {
    const result = validationResult(req);

    if (!result.isEmpty()) {
      throw new Error(`${result.errors[0].path}: ${result.errors[0].msg}`);
    }

    const data = matchedData(req);

    const teamName = data.teamName;

    let team = await dbController.resolveTeamsFull({
      name: teamName,
    });

    if (!team[0]) {
      throw new Error("Echipa nu a fost gasita");
    }

    if (!team[0].users.find((x) => x._id.equals(req.session.userId))) {
      const userToCheck = await users.findById(req.session.userId);
      if (!userToCheck || !userToCheck.isAdmin) {
        //DONT SEND TEAM IF SCOREBOARD HIDDEN AND USER NOT IN TEAM OR ADMIN
        const scoreboardHidden = await ctfConfig.findOne({
          name: "scoreboardHidden",
        });
        if (scoreboardHidden.value) {
          res.send({ state: "error", message: "Clasamentul este ascuns!" });
          return;
        }
      }
    }

    res.send(team[0]);
  } catch (err) {
    if (err) {
      res.send({ state: "error", message: err.message });
    }
  }
};

exports.kickUser = async function (req, res) {
  try {
    const result = validationResult(req);

    if (!result.isEmpty()) {
      throw new Error(`${result.errors[0].path}: ${result.errors[0].msg}`);
    }

    const data = matchedData(req);

    const userToCheck = await users.findOne({
      username: data.userToKick,
      verified: true,
    });

    let userTeamExists;
    if (ObjectId.isValid(userToCheck.teamId)) {
      userTeamExists = await teams.findById(userToCheck.teamId);
    }

    if (!userTeamExists) {
      throw new Error("Utilizatorul nu face parte din nicio echipa!");
    }

    if (userTeamExists.teamCaptain !== req.session.userId) {
      throw new Error("Nu esti capitanul echipei!");
    }

    let newTeamUsers = userTeamExists.users.filter(
      (user) => user.username != req.body.userToKick
    );
    await teams
      .findOneAndUpdate(
        { _id: userTeamExists.id },
        { $set: { users: newTeamUsers } },
        { returnOriginal: false }
      )
      .then(async function (team) {
        await users
          .findOneAndUpdate(
            { username: req.body.userToKick, verified: true },
            { teamId: "none" },
            { returnOriginal: false }
          )
          .then(async function (user) {
            if (team.users) {
              if (team.users.length <= 0) {
                await teams.findByIdAndRemove(team.id);
              }
            }

            res.send({
              state: "success",
              message: "Utilizator eliminat din echipa!",
            });
          });
      });
  } catch (err) {
    if (err) {
      res.send({ state: "error", message: err.message });
    }
  }
};

exports.saveTeamCountry = async function (req, res) {
  try {
    const result = validationResult(req);

    if (!result.isEmpty()) {
      throw new Error(`${result.errors[0].path}: ${result.errors[0].msg}`);
    }

    const data = matchedData(req);

    const country = data.country;

    const userToCheck = await users.findById(req.session.userId);

    let userTeamExists;
    if (ObjectId.isValid(userToCheck.teamId)) {
      userTeamExists = await teams.findById(userToCheck.teamId);
    }

    if (!userTeamExists) {
      throw new Error("Utilizatorul nu face parte din nicio echipa!");
    }
    if (userTeamExists.teamCaptain !== req.session.userId) {
      throw new Error("Nu esti capitanul echipei!");
    }

    await teams.findOneAndUpdate(
      { _id: userTeamExists.id },
      { $set: { country: country } }
    );

    res.send({
      state: "success",
      message: "Tara echipei a fost schimbata!",
    });
  } catch (err) {
    if (err) {
      res.send({ state: "error", message: err.message });
    }
  }
};