const mongoose = require('mongoose');

const placeSchema = new mongoose.Schema({
  owner: {type:mongoose.Schema.Types.ObjectId, ref:'User'},
  title: String,
  address: String,
  photos: String,
  room:String,
  lobby:String,
  description: String,
  message:String,
  perks: {
    oven: Boolean,
    swimmingPool: Boolean,
    indianToilet: Boolean,
    securityCamera: Boolean,
    food: Boolean,
    refrigerator: Boolean,
    laundry: Boolean,
    wifi: Boolean,
    parking: Boolean,
    tv: Boolean,
    bed: Boolean,
  },
  checkIn: Number,
  checkOut: Number,
  maxGuests: Number,
  price: Number,
});

const PlaceModel = mongoose.model('Place', placeSchema);

module.exports = PlaceModel;