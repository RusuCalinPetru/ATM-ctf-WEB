exports.init = async function (api) {};

exports.registerEntrypoint = async function (api, req, res) {
  [req, res] = api.userController.register.verify(req, res);
  if (!checkEmail(req.body.email)) throw Error("Email invalid!");
  [req, res] = api.userController.register.manipulate(req, res);

  const message = `
  Salut ${user.username},

  Multumim pentru inregistrare! Pentru a confirma contul, acceseaza link-ul de mai jos:
  ${process.env.BACKEND_URI}/api/verify/${user._id}/${user.token}

  ATM{CTF}!
`;
  await sendEmail(user.email, "Bun venit la ATM{CTF} - Confirma email-ul", message);

  res.message = {
    state: "success",
    message: "Inregistrat! Acum verifica emailul!",
  };

  return req, res;
};

function checkEmail(email) {
  if (
    !email.match(
      /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    )
  ) {
    return false;
  }
  return true;
}

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
    throw Error("Sending email esuat!");
  }
};

async function verifyMail(req, res) {
  try {
    const user = await users.findOne({ _id: req.params.id });
    if (!user) throw new Error("Invalid Link");

    if (user.token != req.params.token) throw new Error("Invalid Link");

    await users.updateOne({ _id: user._id }, { verified: true, token: "" });

    res.send("Email verificat!");
  } catch (err) {
    if (err) {
      res.send(err.message);
    }
  }
}
