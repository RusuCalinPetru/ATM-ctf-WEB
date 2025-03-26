const { validationResult, matchedData } = require("express-validator");
const Users = require("../models/userModel");
const { v4 } = require("uuid");
const ctfConfig = require("../models/ctfConfigModel.js");
const theme = require("../models/themeModel.js");
const teams = require("../models/teamModel.js");
const challenges = require("../models/challengeModel.js");
const encryptionController = require("./encryptionController.js");
const logController = require("./logController.js");
const ObjectId = require("mongoose").Types.ObjectId;
const nodemailer = require("nodemailer");
const dbController = require("./dbController");

exports.login = async function (req, res) {
  try {
    const result = validationResult(req);

    if (!result.isEmpty()) {
      throw new Error(`${result.errors[0].path}: ${result.errors[0].msg}`);
    }

    const data = matchedData(req);

    const username = data.username;
    const password = data.password;

    const user = await Users.findOne({ username: username });

    if (!user) {
      throw new Error("Credentiale incorecte");
    }

    if (!user.verified) {
      throw new Error("Verificati mai intai adresa de email!");
    }

    if (!(await encryptionController.compare(password, user.password))) {
      logController.createLog(req, user, {
        state: "error",
        message: "Credentiale incorecte",
      });

      throw new Error("Credentiale incorecte");
    }

    const newKey = v4();

    req.session.userId = user._id.toString();
    req.session.key = newKey;
    user.password = undefined;
    await Users.updateOne({ username: username }, { key: newKey.toString() });

    //create log for admin
    logController.createLog(req, user, {
      state: "success",
      message: "Autentificat",
    });

    res.send({ state: "success", message: "Autentificat" });
  } catch (err) {
    if (err) {
      res.send({ state: "error", message: err.message });
    }
  }
};

exports.logout = async function (req, res) {
  req.session.userId = undefined;
  req.session.key = undefined;
  res.sendStatus(200);
};

const sendEmail = async (email, subject, text) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.HOST,
      port: process.env.MAIL_PORT,
      secure: true,
      auth: {
        user: process.env.MAIL,
        pass: process.env.PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.USER,
      to: email,
      subject: subject,
      text: text,
    });
  } catch (error) {
    console.log(error);
  }
};

exports.register = async function (req, res) {
  try {
    const result = validationResult(req);

    if (!result.isEmpty()) {
      throw new Error(`${result.errors[0].path}: ${result.errors[0].msg}`);
    }

    const data = matchedData(req);

    const username = data.username;
    const email = data.email;
    const password = await encryptionController.encrypt(data.password);
    const userCategory = data.userCategory;

    const userCategories = (await ctfConfig.findOne({ name: "userCategories" }))
      .value;

    if (!userCategories.find((x) => x === userCategory))
      throw new Error("Categoria de utilizator nu exista!");

    //check if username exists
    const userExists = await Users.findOne({ username: username });

    if (userExists) throw new Error("Numele de utilizator exista deja!");

    const newKey = v4();

    await Users.create({
      username: username,
      password: password,
      email: email,
      category: userCategory,
      key: newKey.toString(),
      isAdmin: false,
      verified: process.env.MAIL_VERIFICATION == "true" ? false : true,
      token: process.env.MAIL_VERIFICATION == "true" ? v4() : "",
    })
    .then(async function (user) {
      if (process.env.MAIL_VERIFICATION == "true") {
        const message = `Salut ${username},

Bine ai venit in competitia ATM{CTF}! Suntem incantati sa te avem alaturi de noi in aceasta aventura de securitate informatica.

Pentru a-ti activa contul si a incepe provocarile, te rugam sa accesezi urmatorul link:

${process.env.BACKEND_URI}/api/verify/${user._id}/${user.token}

Odata ce ai verificat adresa de email, poti incepe sa rezolvi provocarile si sa castigi puncte.

Mult succes si spor la vanat flag-uri!

Echipa ATM{CTF}`;
        await sendEmail(user.email, "Verificare Email CTF - Bine ai venit!", message);

        res.send({
          state: "success",
          message: "Inregistrat! Acum verificati adresa de email!",
        });
        } else {
          req.session.userId = user._id.toString();
          req.session.key = newKey.toString();

          res.send({ state: "success", message: "Inregistrat", verified: true });
        }
      })
      .catch(function (err) {
        throw new Error("Crearea utilizatorului a esuat!");
      });
  } catch (err) {
    if (err) {
      res.send({ state: "error", message: err.message });
    }
  }

  //RESPONSE PHASE END
};

exports.verifyMail = async function (req, res) {
  try {
    const result = validationResult(req);

    if (!result.isEmpty()) {
      throw new Error(`${result.errors[0].path}: ${result.errors[0].msg}`);
    }

    const data = matchedData(req);

    const user = await Users.findById(data.id);
    if (!user) throw new Error("Link invalid");

    if (user.token !== req.params.token) throw new Error("Link invalid");

    await Users.updateOne({ _id: user._id }, { verified: true, token: "" });

    res.send("Email verificat! Acum va puteti autentifica!");
  } catch (err) {
    if (err) {
      res.send(err.message);
    }
  }
};

exports.updateUsername = async function (req, res) {
  try {
    const result = validationResult(req);

    if (!result.isEmpty()) {
      throw new Error(`${result.errors[0].path}: ${result.errors[0].msg}`);
    }

    const data = matchedData(req);

    const username = data.newUsername;

    //check if username exists
    const userExists = await Users.findOne({
      username: username,
      verified: true,
    });

    if (userExists) {
      throw new Error("Numele de utilizator exista deja!");
    }

    await Users.findByIdAndUpdate(
      req.session.userId,
      { username: username },
      { returnOriginal: false }
    )
      .then(async function (user) {
        if (ObjectId.isValid(user.teamId)) {
          let userTeamExists = await teams.findById(user.teamId);

          if (userTeamExists) {
            let newUsers = userTeamExists.users;

            newUsers.forEach((userInTeam) => {
              if (userInTeam._id.equals(user._id)) {
                userInTeam.username = username;
              }
            });

            await teams
              .findByIdAndUpdate(
                user.teamId,
                { users: newUsers },
                { returnOriginal: false }
              )
              .then(async function (team) {
                user.password = undefined;
                res.send({
                  state: "success",
                  message: "Numele de utilizator a fost actualizat!",
                });
              });
          }
        } else {
          res.send({
            state: "success",
            message: "Numele de utilizator a fost actualizat!",
          });
        }
      })
      .catch(function (err) {
        console.log(err.message);
        throw new Error("Actualizarea utilizatorului a esuat!");
      });
  } catch (err) {
    if (err) {
      res.send({ state: "error", message: err.message });
    }
  }
};

exports.updatePassword = async function (req, res) {
  try {
    const result = validationResult(req);

    if (!result.isEmpty()) {
      throw new Error(`${result.errors[0].path}: ${result.errors[0].msg}`);
    }

    const data = matchedData(req);

    const newPassword = data.newPassword;
    const oldPassword = data.oldPassword;

    const user = await Users.findById(req.session.userId);

    if (!user) {
      throw new Error("Credentiale incorecte");
    }

    if (!(await encryptionController.compare(oldPassword, user.password))) {
      throw new Error("Credentiale incorecte");
    }

    await Users.findByIdAndUpdate(
      req.session.userId,
      { password: await encryptionController.encrypt(newPassword) },
      { returnOriginal: false }
    ).catch(function (err) {
      console.log(err.message);
      throw new Error("Actualizarea utilizatorului a esuat!");
    });

    res.send({
      state: "success",
      message: "Parola a fost actualizata!",
    });
  } catch (err) {
    if (err) {
      res.send({ state: "error", message: err.message });
    }
  }
};

exports.getUsers = async function (req, res) {
  try {
    const result = validationResult(req);

    if (!result.isEmpty()) {
      throw new Error(`${result.errors[0].path}: ${result.errors[0].msg}`);
    }

    const data = matchedData(req);

    let page = data.page;
    let search = data.search;
    let userCategory = req.body.category;

    const userToCheck = await Users.findById(req.session.userId);
    if (!userToCheck || !userToCheck.isAdmin) {
      //DONT SEND USERS IF SCOREBOARD HIDDEN AND NOT ADMIN
      const scoreboardHidden = await ctfConfig.findOne({
        name: "scoreboardHidden",
      });
      if (scoreboardHidden.value) {
        res.send({ state: "error", message: "Clasamentul este ascuns!" });
        return;
      }
    }

    const userCategories = (await ctfConfig.findOne({ name: "userCategories" }))
      .value;

    if (userCategory && !userCategories.find((x) => x === userCategory))
      throw new Error("Categoria de utilizator nu exista!");

    let userCount = await Users.count();
    if ((page - 1) * 100 > userCount) {
      throw new Error("Nu mai exista pagini!");
    }

    let allUsers = [];
    allUsers = await dbController
      .resolveUsers({
        category: userCategory ? userCategory : { $exists: true },
        username: new RegExp(search, "i"),
        verified: true,
        $or: [{ _id: req.session.userId }, { shadowBanned: false }],
      })
      .sort({ score: -1, _id: 1 })
      .skip((page - 1) * 100)
      .limit(100);

    res.send(allUsers);
  } catch (err) {
    if (err) {
      res.send({ state: "error", message: err.message });
    }
  }
};

exports.getUser = async function (req, res) {
  try {
    const result = validationResult(req);

    if (!result.isEmpty()) {
      throw new Error(`${result.errors[0].path}: ${result.errors[0].msg}`);
    }

    const data = matchedData(req);

    const username = data.username;

    const users = await dbController.resolveUsers({
      username: username,
      verified: true,
      $or: [{ _id: req.session.userId }, { shadowBanned: false }],
    });

    if (!users[0]) {
      throw new Error("Utilizatorul nu a fost gasit!");
    }

    const user = users[0];

    if (!user._id.equals(req.session.userId)) {
      const userToCheck = await Users.findById(req.session.userId);
      if (!userToCheck || !userToCheck.isAdmin) {
        //DONT SEND USER IF SCOREBOARD HIDDEN AND ITS NOT THE USER HIMSELF OR ADMIN
        const scoreboardHidden = await ctfConfig.findOne({
          name: "scoreboardHidden",
        });
        if (scoreboardHidden.value) {
          throw new Error("Clasamentul este ascuns!");
        }
      }
    }

    res.send(user);
  } catch (err) {
    if (err) {
      res.send({ state: "error", message: err.message });
    }
  }
};

exports.getEndTime = async function (req, res) {
  const endTime = await ctfConfig.findOne({ name: "endTime" });

  res.send(endTime.value.toString());
};

exports.getConfigs = async function (req, res) {
  const configs = await ctfConfig.find({});

  res.send(configs);
};

exports.getTheme = async function (req, res) {
  const currentTheme = await theme.findOne({});

  if (currentTheme) {
    res.send({ state: "success", theme: currentTheme });
  } else {
    res.send({ state: "error", message: "Nu exista nicio tema!" });
  }
};

exports.getScoreboard = async function (req, res) {
  const scoreboardHidden = await ctfConfig.findOne({
    name: "scoreboardHidden",
  });

  if (scoreboardHidden.value) {
    res.send({ state: "error", message: "Clasamentul este ascuns!" });
    return;
  }

  let allTeams = await dbController
    .resolveTeamsMin({
      users: { $not: { $elemMatch: { shadowBanned: true } } },
    })
    .sort({ totalScore: -1, maxTimestamp: 1, _id: 1 });

  let finalData = {
    standings: [],
  };

  for (let i = 0; i < allTeams.length; i++) {
    if (allTeams[i].totalScore > 0) {
      finalData.standings.push({
        pos: i + 1,
        team: allTeams[i].name,
        score: allTeams[i].totalScore,
      });
    }
  }

  res.send(finalData);
};

exports.getTeamCount = async function (req, res) {
  let teamsCount = await teams.countDocuments({});
  res.send({ state: "success", count: teamsCount });
};