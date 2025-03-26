const express = require("express");
const app = express();
const mongoose = require("mongoose");
mongoose.set('strictQuery', false); //pregatire pentru comportamentul implicit din Mongoose 7
const db = mongoose.connection;
const dotenv = require("dotenv");
dotenv.config();
const port = process.env.PORT || 3001;
const bodyparser = require("body-parser");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const fileUpload = require("express-fileupload");
const mongoSanitize = require("express-mongo-sanitize");
const xssClean = require("xss-clean/lib/xss").clean;
const setup = require("./setup.js");
const userRouter = require("./routes/userRoutes.js");
const adminRouter = require("./routes/adminRoutes.js");
const globalRouter = require("./routes/globalRoutes.js");
const users = require("./models/userModel.js");
//mongoDB connectare
mongoose.connect(process.env.MONGODB_CONNSTRING, {
  authSource: "admin",
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
db.once("open", async function () {
  console.log("Database Connected successfully");
  setup.setupDB();
});
//parsaje json si formularea
app.use(bodyparser.urlencoded({ extended: false }));
app.use(bodyparser.json());
var sess = {
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_CONNSTRING,
    touchAfter: 24 * 3600, //actualizeaza sesiunea o data la 24 de ore
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7 * 2,//cookie-uri valabile pentru 2 saptamani
  },
};
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1); //recunoaste ip-ul real al clientului
  //sess.cookie.secure = true; //securizează cookie-urile
  sess.proxy = true; //serverul rulat in spatele unui cookie
}
app.use(session(sess));
//sanitizeaza datele de intrare
app.use(function (req, res, next) {
  //config CORS (Cross-Origin Resource Sharing)
  res.setHeader("Access-Control-Allow-Origin", process.env.FRONTEND_URI);
  //request methods you wish to allow
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS"
  );
  //request headers you wish to allow
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Set-Cookie,X-Requested-With,content-type"
  );
  //set to true if you need the website to include cookies in the requests sent to API
  res.setHeader("Access-Control-Allow-Credentials", true);
  //trece la urmatorul middleware
  next();
});
//file upload suport
app.use(
  fileUpload({
    limits: {
      fileSize: 100000000, //100MB
    },
    createParentPath: true,
  })
);
//sanitizeaza datele de auth
function checkAuth(req, res, next) {
  users.findById(req.session.userId).then(function (user) {
    if (!user) {
      res.send({ state: "sessionError" });
    } else if (!(user.key == req.session.key)) {
      res.send({ state: "sessionError" });
    } else {
      if (user.isAdmin) {
        req.isAdmin = true;
      }
      next();
    }
  });
}
//verificare admin
function checkAdminAuth(req, res, next) {
  users.findById(req.session.userId).then(function (user) {
    if (!user) {
      res.send({ state: "sessionError" });
    } else if (!(user.key == req.session.key)) {
      res.send({ state: "sessionError" });
    } else if (!user.isAdmin) {
      res.send({ state: "sessionError" });
    } else {
      next();
    }
  });
}
app.use("/api", globalRouter);
app.use("/api/user", checkAuth, userRouter);
app.use("/api/admin", checkAdminAuth, adminRouter);
app.use("/api/assets", express.static("./assets"));
process.on("uncaughtException", function (err) {
  console.log("Uncaught exception: " + err.stack);
  console.log("NODE NOT EXITING");
});
app.listen(port, () => {
  console.log(`listening on port ${port}`);
});