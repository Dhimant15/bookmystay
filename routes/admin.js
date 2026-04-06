const express = require("express");
const router = express.Router();

const User = require("../models/user");
const Booking = require("../models/booking");
const Listing = require("../models/listing");

const { isAdmin } = require("../middleware");

//  Admin Dashboard
router.get("/admin", isAdmin, async (req, res) => {
    const users = await User.find({});
    
    const bookings = await Booking.find({})
        .populate("user")
        .populate("listing");

    //  Total Revenue
    const totalRevenue = bookings.reduce((sum, b) => {
    return sum + (b.total || 0);
}, 0);

    res.render("admin/dashboard", {
        users,
        bookings,
        totalRevenue
    });
});

//  Delete User
router.delete("/admin/user/:id", isAdmin, async (req, res) => {
    await User.findByIdAndDelete(req.params.id);
    req.flash("success", "User deleted successfully");
    res.redirect("/admin");
});

//  Delete Listing
router.delete("/admin/listing/:id", isAdmin, async (req, res) => {
    await Listing.findByIdAndDelete(req.params.id);
    req.flash("success", "Listing deleted successfully");
    res.redirect("/admin");
});

// ❌ Delete Booking (Cancel Booking)
router.delete("/admin/booking/:id", isAdmin, async (req, res) => {
    await Booking.findByIdAndDelete(req.params.id);
    req.flash("success", "Booking cancelled successfully");
    res.redirect("/admin");
});

module.exports = router;