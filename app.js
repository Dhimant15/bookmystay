if(process.env.NODE_ENV != "production"){
    require("dotenv").config();
}

const adminRoutes = require("./routes/admin");
const express = require("express");
const app = express(); 
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const ExpressError = require("./utils/ExpressError.js");
const session = require("express-session");
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");
const Booking = require("./models/booking");
const Razorpay = require("razorpay");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY,
  key_secret: process.env.RAZORPAY_SECRET,
});




const listingRouter = require("./routes/listing.js");
const reviewRouter = require("./routes/review.js");
const userRouter = require("./routes/user.js");

const MONGO_URL = process.env.MONGO_URL;

main()
    .then(() => {
        console.log("connected to DB");
    })
    .catch((err) => {
        console.log(err);
    });

async function main() {
    await mongoose.connect(MONGO_URL);
}

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views")); 
app.use(express.urlencoded({extended: true}));
app.use(methodOverride("_method"));
app.engine('ejs', ejsMate);
app.use(express.static(path.join(__dirname, "/public")));

const sessionOptions = {
    secret: "mysupersecretcode",
    resave: false,
    saveUninitialized: true,
    cookie: {
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
    },
};

// app.get("/", (req, res) => {
//     res.send("Hi, I am root");
// });

app.use(session(sessionOptions));
app.use(flash()); 

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currUser = req.user;
    next();
});

// app.get("/demouser", async(req, res) => {
//     let fakeUser = new User({
//         email: "student@gmail.com",
//         username: "delta-student",
//     });
//     let registeredUser = await User.register(fakeUser, "helloworld");
//     res.send(registeredUser);
// });

app.use("/listings", listingRouter)
app.use("/listings/:id/reviews", reviewRouter);
app.use("/", userRouter);
app.use("/", adminRoutes);

app.post("/payment", async (req, res) => {
  const { checkIn, checkOut, total, listingId } = req.body;

  // Razorpay order create
  const options = {
    amount: total * 100, // ₹ → paise
    currency: "INR",
    receipt: "order_rcptid_" + Date.now()
  };

  const order = await razorpay.orders.create(options);

  res.render("payment", {
    checkIn,
    checkOut,
    total,
    listingId,
    orderId: order.id,
    key: "rzp_test_SZEwnOfdmln8wu" // 
  });
});


app.get("/confirm-booking", async (req, res) => {
  try {
    const { checkIn, checkOut, total, listingId } = req.query;

    // 🔐 User login check
    if (!req.user) {
      return res.send("Please login first");
    }

    // ⚠️ Basic validation
    if (!checkIn || !checkOut || !total || !listingId) {
      return res.send("Invalid booking data");
    }

    // 💾 Save booking
    const newBooking = new Booking({
      checkIn,
      checkOut,
      total,
      user: req.user._id,
      listing: listingId
    });

    await newBooking.save();

    // ✅ Redirect to My Bookings
    res.redirect("/my-bookings");

  } catch (err) {
    console.log(err);
    res.send("Something went wrong ❌");
  }
});


app.get("/my-bookings", async (req, res) => {
  if (!req.user) {
    return res.send("Please login first");
  }

  const bookings = await Booking.find({ user: req.user._id }).populate("listing");
  res.render("bookings", { bookings });
});

app.get("/profile", (req, res) => {
  if (!req.user) {
    return res.redirect("/login");
  }

  res.render("profile", { user: req.user });
});

app.post("/bookings/:id/delete", async (req, res) => {
  if (!req.user) {
    return res.send("Login first");
  }

  const booking = await Booking.findById(req.params.id);

  if (!booking.user.equals(req.user._id)) {
    return res.send("Unauthorized ❌");
  }

  await Booking.findByIdAndDelete(req.params.id);

  res.redirect("/my-bookings");
});


app.use((req, res, next) => {
    next(new ExpressError(404, "Page not found!"));
})

app.use((err, req, res, next) => {
    let {statusCode=500, message="something went wrong"} = err;
    res.status(statusCode).render("error.ejs", { message });
    // res.status(statusCode).send(message);
});

app.listen(8080, () => {
    console.log("server is listening to port 8080");
})