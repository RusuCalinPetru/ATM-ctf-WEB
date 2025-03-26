'use strict';
const mongoose = require('mongoose');
var Schema = mongoose.Schema;
//detaliile despre useri
var userSchema = new Schema({
    username: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    discordId: {
        type: String,
        default: 'none'
    }, //discord id
    password: {
        type: String,
        required: true
    },
    solved: {
        type: Array,
        default: [],
    },//challenges solved
    score: {
        type: Number,
        default: 0
    },
    key: {
        type: String,
        required: true
    },//key validare sesiune
    isAdmin: {
        type: Boolean,
        default: false
    },//daca e admin
    teamId: {
        type: String,
        default: 'none'
    },
    verified: {
        type: Boolean,
        default: false
    },//daca e verificat emailul
    token: {
        type: String,
    },//token validare email
    hintsBought: {
        type: Array,
        default: [],
    },//hinturile cumparate la challenge-uri
    shadowBanned: {
        type: Boolean,
        default: false
    },//shadow ban !
    adminPoints: {
        type: Number,
        default: 0
    },//puncte date de admin
    category: {
        type: String,
        required: false
    }
});

module.exports = mongoose.model('Users', userSchema);