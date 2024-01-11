const express = require('express');
const Event = require('../models/Event');
const Wine = require('../models/Wine');
const router = express.Router();

router.post('/create', async (req, res) => {
    try {
        const { eventName, eventDate, isBlindTasting } = req.body;
        const newEvent = new Event({
            name: eventName,
            date: eventDate,
            isBlindTasting: isBlindTasting === 'on',
            wines: [],
            user: req.session.userId,
            participants: [{ user: req.session.userId, role: 'organizzatore' }]
        });
        await newEvent.save();

        res.redirect('/event-detail/' + newEvent._id);
    } catch (error) {
        console.log(error);
        res.status(500).send('Errore durante la creazione dell\'evento');
    }
});

router.post('/join', async (req, res) => {
    try {
        const event = await Event.findById(req.body.eventId);
        if (!event) {
            // Gestisci evento non trovato
            return res.status(404).send('Evento non trovato');
        }

        // Verifica se l'utente è già un partecipante
        const isParticipant = event.participants.some(participant => 
            participant.user.toString() === req.session.userId.toString());

        if (!isParticipant) {
            event.participants.push({ user: req.session.userId, role: 'partecipante' }); // Modifica qui
            await event.save();
        }

        res.redirect('/event-detail/' + req.body.eventId);
    } catch (error) {
        console.log(error);
        res.status(500).send('Errore durante la partecipazione all\'evento');
    }
});


module.exports = router;