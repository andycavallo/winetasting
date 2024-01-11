const express = require('express');
const multer = require('multer');
const Wine = require('../models/Wine');
const Event = require('../models/Event'); // Assicurati che sia importato correttamente
const router = express.Router();

// Configura Multer per l'upload delle immagini
const upload = multer({ dest: 'uploads/' });

// Route per aggiungere un nuovo vino
router.post('/add', upload.single('wineImage'), async (req, res) => {
    try {
        // Crea il nuovo vino
        const newWine = new Wine({
            name: req.body.name,
            producer: req.body.producer,
            year: req.body.year,
            type: req.body.type,
            description: req.body.description,
            imagePath: req.file ? req.file.path : null,
            event: req.body.eventId
        });
        await newWine.save();

        // Aggiorna l'evento con il nuovo vino
        const eventId = req.body.eventId;
        if (eventId) {
            await Event.findByIdAndUpdate(eventId, { $push: { wines: newWine._id } });
        }

        // Reindirizza alla pagina dettagli evento
        res.redirect('/event-detail/' + eventId);
    } catch (error) {
        console.log(error);
        res.status(500).send('Errore durante l\'aggiunta del vino');
    }
});

// Route per rimuovere un vino
router.post('/remove/:wineId', async (req, res) => {
    try {
        const wine = await Wine.findByIdAndDelete(req.params.wineId);
        if (wine.event) {
            await Event.findByIdAndUpdate(wine.event, { $pull: { wines: wine._id } });
        }
        res.redirect('/event-detail/' + wine.event);
    } catch (error) {
        console.log(error);
        res.status(500).send('Errore durante la rimozione del vino');
    }
});

// Route per la valutazione un vino
router.post('/rate/:wineId', async (req, res) => {
  const { wineId } = req.params;
  const { visualExam, olfactoryExam, tasteOlfactoryExam, overallJudgment } = req.body;

  try {
    const wine = await Wine.findById(wineId);
    if (!wine) {
      return res.status(404).send('Vino non trovato');
    }

    const rating = {
      user: req.session.userId,
      visualExam: parseFloat(visualExam),
      olfactoryExam: parseFloat(olfactoryExam),
      tasteOlfactoryExam: parseFloat(tasteOlfactoryExam),
      overallJudgment: parseFloat(overallJudgment),
      submitted: true
    };

    wine.ratings.push(rating);
    await wine.save();

    res.redirect('/event-detail/' + wine.event);
  } catch (error) {
    console.log(error);
    res.status(500).send('Errore durante la valutazione del vino');
  }
});

module.exports = router;
