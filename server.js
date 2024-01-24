const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const Wine = require('./models/Wine');
const Event = require('./models/Event');
const User = require('./models/User');
const wineRoutes = require('./routes/wineRoutes');
const userRoutes = require('./routes/userRoutes');
const eventRoutes = require('./routes/eventRoutes');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));
app.set('view engine', 'ejs');

app.use(session({
  secret: 'tuo_segreto',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));
// Modifica qui la stringa di connessione a MongoDB Atlas
mongoose.connect('mongodb+srv://andycavallo:invinoveritas@andycavallo.1mc65qd.mongodb.net/?retryWrites=true&w=majority')
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch(err => console.error('Could not connect to MongoDB Atlas', err));

/*mongoose.connect('mongodb://localhost:27017/wineTastingApp')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Could not connect to MongoDB', err));*/

app.use('/api/wines', wineRoutes);
app.use('/api/users', userRoutes);
app.use('/api/events', eventRoutes);

// Middleware per verificare se l'utente è autenticato
function ensureAuthenticated(req, res, next) {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    next();
}

app.use((req, res, next) => {
  res.locals.userId = req.session.userId;
  next();
});

app.get('/wine-tasting', ensureAuthenticated, async (req, res) => {
    try {
        const createdEvents = await Event.find({ user: req.session.userId })
                                             .populate({
                                                 path: 'participants.user',
                                                 select: 'name surname email'
                                             })
                                             .exec();

        const participatingEvents = await Event.find({ 'participants.user': req.session.userId })
                                                   .populate({
                                                       path: 'participants.user',
                                                       select: 'name surname email'
                                                   })
                                                   .exec();

        const allEvents = [...createdEvents, ...participatingEvents];
        const uniqueEvents = allEvents.filter((event, index, self) => 
            index === self.findIndex((e) => (
                e._id.toString() === event._id.toString()
            ))
        );

        res.render('wineTasting', { events: uniqueEvents });
    } catch (error) {
        console.log(error);
        res.status(500).send('Errore durante il recupero degli eventi');
    }
});

app.get('/', (req, res) => {
  if (req.session.userId) {
    res.redirect('/wine-tasting');
  } else {
    res.render('index');
  }
});

app.get('/register', (req, res) => {
  if (req.session.userId) {
    res.redirect('/wine-tasting');
  } else {
    res.render('register', { query: req.query });
  }
});

app.get('/create-event', ensureAuthenticated, (req, res) => {
  res.render('createEvent');
});

app.get('/add-wine', ensureAuthenticated, (req, res) => {
  const eventId = req.query.eventId;
  res.render('addWine', { eventId });
});

app.get('/event-detail/:eventId', ensureAuthenticated, async (req, res) => {
    try {
        const eventId = req.params.eventId;
        const eventData = await Event.findById(eventId)
                                     .populate('wines')
                                     .populate({
                                         path: 'participants.user',
                                         select: 'name surname email'
                                     });
        res.render('eventDetail', { eventData });
    } catch (error) {
        console.log(error);
        res.status(500).send('Errore durante il recupero dei dettagli dell\'evento');
    }
});

app.get('/rate-wine/:wineId', ensureAuthenticated, async (req, res) => {
    try {
        const wineId = req.params.wineId;
        const wine = await Wine.findById(wineId).exec();

        if (!wine) {
            return res.status(404).send("Vino non trovato");
        }

        res.render('rate-wine', { wine });
    } catch (error) {
        console.log(error);
        res.status(500).send("Errore durante il recupero del vino");
    }
});

app.get('/wine-ratings/:wineId', async (req, res) => {
    try {
        const wineId = req.params.wineId;
        const wine = await Wine.findById(wineId).populate('ratings.user');
        if (!wine) {
            return res.status(404).send("Vino non trovato");
        }

        const event = await Event.findOne({ wines: wineId })
                                 .populate({
                                     path: 'participants.user',
                                     select: 'name surname email'
                                 });

        if (!event) {
            return res.status(404).send("Evento non trovato");
        }

        // Calcola l'indice del vino nell'array dei vini dell'evento
        const wineIndex = event.wines.findIndex(w => w.toString() === wineId) + 1;

        res.render('wineRatings', { 
            eventId: event._id, 
            participants: event.participants, 
            wine: wine,
            isBlindTasting: event.isBlindTasting,
            eventData: event,
            wineIndex: wineIndex // Aggiungi questa linea
        });
    } catch (error) {
        console.log(error);
        res.status(500).send("Errore durante il recupero dei dettagli del vino");
    }
});




app.get('/join-event', ensureAuthenticated, (req, res) => {
    res.render('joinEvent');
});

app.post('/api/events/join', ensureAuthenticated, async (req, res) => {
  try {
    const eventId = req.body.eventId;
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).send("Evento non trovato");
    }

    const user = await User.findById(req.session.userId);
    const isParticipant = event.participants.some(p => p.user.equals(user._id));
    if (!isParticipant) {
      event.participants.push({ user: user._id, role: 'partecipante' });
      await event.save();
    }
    
    res.redirect('/event-detail/' + eventId);
  } catch (error) {
    console.log(error);
    res.status(500).send("Errore durante la partecipazione all'evento");
  }
});

app.post('/api/events/change-blind-tasting-status/:eventId', async (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ success: false, message: 'Non autorizzato' });
    }

    try {
        const event = await Event.findById(req.params.eventId);
        if (!event) {
            return res.status(404).json({ success: false, message: 'Evento non trovato' });
        }

        if (event.user.toString() !== req.session.userId.toString()) {
            return res.status(403).json({ success: false, message: 'Azione non permessa' });
        }

        event.isBlindTasting = req.body.isBlindTasting;
        await event.save();
        
        res.json({ success: true, message: 'Stato aggiornato' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Errore del server' });
    }
});

// Route POST per rimuovere un partecipante da un evento
app.post('/api/events/remove-participant/:eventId/:participantId', ensureAuthenticated, async (req, res) => {
    try {
        const { eventId, participantId } = req.params;

        // Trova l'evento
        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).send('Evento non trovato.');
        }

        // Verifica che l'utente che fa la richiesta sia l'organizzatore
        if (event.user.toString() !== req.session.userId) {
            return res.status(403).send('Non autorizzato.');
        }

        // Verifica che l'ID del partecipante non sia quello dell'organizzatore
        if (participantId === event.user.toString()) {
            return res.status(400).send('Non puoi rimuovere l\'organizzatore.');
        }

        // Rimuovi il partecipante dall'elenco dei partecipanti
        event.participants = event.participants.filter(
            participant => participant.user.toString() !== participantId
        );

        await event.save();
        res.redirect('/event-detail/' + eventId);
    } catch (error) {
        console.error(error);
        res.status(500).send('Errore del server.');
    }
});

app.post('/api/events/remove/:eventId', ensureAuthenticated, async (req, res) => {
  try {
    await Event.findOneAndDelete({ _id: req.params.eventId, user: req.session.userId });
    res.redirect('/wine-tasting');
  } catch (error) {
    console.log(error);
    res.redirect('/wine-tasting');
  }
});

app.get('/login', (req, res) => {
  if (req.session.userId) {
    res.redirect('/wine-tasting');
  } else {
    res.render('login', { query: req.query });
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.log(err);
    }
    res.redirect('/');
  });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening on port ${port}...`));

module.exports = app;