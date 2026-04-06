const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const Listing = require("../models/listing.js");
const { isLoggedIn, isOwner, validateListing } = require("../middleware.js");
const { listingSchema } = require("../schema.js");
const listingController = require("../controllers/listings.js");
const multer = require('multer');
const { storage } = require("../cloudConfig.js");
const upload = multer({ storage });
const Booking = require("../models/booking");


router.route("/")
    .get(wrapAsync(listingController.index))
    .post(
        isLoggedIn, 
        upload.single('listing[image]'),
        wrapAsync(listingController.createListing)
    );
    


//New Route
router.get("/new", isLoggedIn, listingController.renderNewForm);


router.route("/:id")
    .get(wrapAsync(listingController.showListing))
    .put(
    isLoggedIn,
    isOwner,
    upload.single('listing[image]'),
    validateListing,
    wrapAsync(listingController.updateListing))
    .delete(
    isLoggedIn,
    isOwner,
    wrapAsync(listingController.destroyListing));


//  Booking route
router.post("/:id/book", isLoggedIn, async (req, res) => {
  let { id } = req.params;
  let { fromDate, toDate } = req.body;

  const listing = await Listing.findById(id);

  //  calculate days
  const days = (new Date(toDate) - new Date(fromDate)) / (1000 * 60 * 60 * 24);

  const totalPrice = days * listing.price;

  const booking = new Booking({
    listing: id,
    user: req.user._id,
    fromDate,
    toDate,
    totalPrice
  });

  await booking.save();

  req.flash("success", "Booking successful!");
  res.redirect(`/listings/${id}`);
});


router.get("/confirm-booking", isLoggedIn, async (req, res) => {
    const { checkIn, checkOut, total, listingId } = req.query;

    const booking = new Booking({
        listing: listingId,
        user: req.user._id,
        fromDate: checkIn,
        toDate: checkOut,
        totalPrice: total
    });

    await booking.save();

    req.flash("success", "Payment successful & booking confirmed!");
    res.redirect(`/listings/${listingId}`);
});


//Edit Route
router.get(
    "/:id/edit", 
    isLoggedIn,
    isOwner,
    wrapAsync(listingController.renderEditForm));


module.exports = router;