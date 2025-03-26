const { check } = require("express-validator");
const ObjectId = require("mongoose").Types.ObjectId;
exports.username = (id = "username") =>
  check(id)
    .notEmpty()
    .withMessage("nu poate fi gol")
    .trim()
    .isLength({ min: 1, max: 32 })
    .withMessage("trebuie sa aiba intre 1 si 32 de caractere")
    .matches(/^[^"$\n@]+$/)
    .withMessage("nu folositi caractere nepermise");
exports.password = (id = "password") =>
  check(id)
    .notEmpty()
    .withMessage("nu poate fi gol")
    .trim()
    .isLength({ min: 8 })
    .withMessage("trebuie sa aiba cel putin 8 caractere");
exports.email = (id = "email") =>
  check(id)
    .notEmpty()
    .withMessage("nu poate fi gol")
    .trim()
    .isEmail()
    .withMessage("nu este un email valid");
exports.userCategory = (id = "userCategory") =>
  check(id).notEmpty().withMessage("nu poate fi gol").trim();
exports.id = (id = "id") =>
  check(id)
    .notEmpty()
    .withMessage("nu poate fi gol")
    .trim()
    .custom((val) => ObjectId.isValid(val))
    .withMessage("nu este un ObjectId valid")
    .customSanitizer((val) => ObjectId(val));
exports.page = (id = "page") =>
  check(id)
    .optional()
    .default(1)
    .isInt({ min: 0 })
    .withMessage("trebuie sa fie un numar intreg");
exports.search = (id = "search") =>
  check(id)
    .optional()
    .default("")
    .isString()
    .withMessage("trebuie sa fie un text")
    .customSanitizer((val) => new RegExp(val, "i"));
exports.teamName = (id = "teamName") =>
  check(id)
    .notEmpty()
    .withMessage("nu poate fi gol")
    .trim()
    .isLength({ min: 1, max: 32 })
    .withMessage("trebuie sa aiba intre 1 si 32 de caractere")
    .matches(/^[^"$\n]+$/)
    .withMessage("nu folositi caractere nepermise");
exports.teamCode = (id = "teamCode") =>
  check(id)
    .notEmpty()
    .withMessage("nu poate fi gol")
    .trim()
    .isUUID(4)
    .withMessage("trebuie sa fie un uuid");
exports.flag = (id = "flag") =>
  check(id).notEmpty().withMessage("nu poate fi gol").trim();
exports.emoji = (id = "emoji") =>
  check(id)
    .notEmpty()
    .withMessage("nu poate fi gol")
    .trim()
    .matches(/^[\uD83C][\uDDE6-\uDDFF][\uD83C][\uDDE6-\uDDFF]$/)
    .withMessage("trebuie sa fie un emoji de steag!");