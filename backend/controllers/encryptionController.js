//https://www.troyhunt.com/we-didnt-encrypt-your-password-we-hashed-it-heres-what-that-means/
//interesting article about bcryptjs and hashing
const bcrypt = require('bcryptjs');

exports.encrypt = async function(pass) {
    return await bcrypt.hash(pass, 10); //adaugam nr de runde de salt e bun intre 10-12 casa nu se sparga
}

exports.compare = async function(pass, hash) {
    return await bcrypt.compare(pass, hash);
}