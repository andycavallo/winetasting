const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    name: String,
    date: Date,
    isBlindTasting: Boolean,
    wines: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Wine'
    }],
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    participants: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        role: {
            type: String,
            enum: ['organizzatore', 'partecipante'],
            default: 'partecipante'
        }
    }]
});

const Event = mongoose.model('Event', eventSchema);

module.exports = Event;