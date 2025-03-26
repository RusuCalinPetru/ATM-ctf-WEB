'use strict';
const mongoose = require('mongoose');
var Schema = mongoose.Schema;

function teamLimit(val) {
    return val.length <= 4;
}
//structura db pentru echipele care participa la ctf
var teamSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    inviteCode: {
        type: String,
        required: true
    },
    users: {
        type: Array,
        validate: [teamLimit, '{PATH} exceeds the limit of 4'],
        required: true,
    },
    teamCaptain: {
        type: String,
        required: false, //true daca vrem sa fie obligatoriu TODO!!
    },
    category: {
        type: String,
        required: true
    },
    country: {
        type: String,
        default: "🌐"
    }
});

module.exports = mongoose.model('Teams', teamSchema);