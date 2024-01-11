const express = require('express');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const router = express.Router();

// Route per la registrazione degli utenti
router.post('/register', async (req, res) => {
  try {
    if (req.body.password !== req.body.confirmPassword) {
      // Reindirizza con un messaggio di errore
      return res.redirect('/register?error=passwordsDontMatch');
    }

    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const user = new User({
      name: req.body.name,
      surname: req.body.surname,
      email: req.body.email,
      password: hashedPassword,
    });

    await user.save();
    // Reindirizza verso la pagina di login o la home dopo la registrazione
    res.redirect('/login');
  } catch (error) {
    // Reindirizza nuovamente alla registrazione con un messaggio di errore generico
    res.redirect('/register?error=genericError');
  }
});
// Route per il login
router.post('/login', async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (user && await bcrypt.compare(req.body.password, user.password)) {
      // Imposta i dati dell'utente nella sessione
      req.session.userId = user._id; // Salva l'ID utente nella sessione
      req.session.userName = user.name; // Puoi aggiungere altri dati se necessario

      // Reindirizza l'utente a una pagina protetta dopo il login riuscito
      res.redirect('/wine-tasting'); // Sostituisci con la tua pagina protetta
    } else {
      // Login fallito
      res.redirect('/login?error=invalidCredentials');
    }
  } catch (error) {
    // Gestisci gli errori
    res.redirect('/login?error=unexpectedError');
  }
});

module.exports = router;