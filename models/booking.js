const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
  checkIn: Date,
  checkOut: Date,
  total: Number,
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  listing: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Listing"
  }
});

module.exports = mongoose.model("Booking", bookingSchema);