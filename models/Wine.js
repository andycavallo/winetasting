const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  visualExam: Number,
  olfactoryExam: Number,
  tasteOlfactoryExam: Number,
  overallJudgment: Number,
  submitted: { type: Boolean, default: false }
});

const wineSchema = new mongoose.Schema({
  name: String,
  producer: String, // Aggiunto il campo per il produttore
  year: String,     // Aggiunto il campo per l'annata
  type: String,
  description: String,
  ratings: [ratingSchema],
  imagePath: String, // Aggiunto il campo per il percorso dell'immagine
  event: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event' // Assumi che tu abbia un modello 'Event'
    }
});

wineSchema.methods.calculateAverageRating = function() {
    if (this.ratings.length === 0) return 0;
    const total = this.ratings.reduce((acc, rating) => {
        return acc + (rating.visualExam + rating.olfactoryExam + rating.tasteOlfactoryExam + rating.overallJudgment) / 4;
    }, 0);
    return total / this.ratings.length;
};

module.exports = mongoose.model('Wine', wineSchema);