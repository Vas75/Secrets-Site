require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");

const port = process.env.PORT || 3000;

const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));

app.use(
  session({
    secret: "Our little secret.",
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

//userDB and users collection first appear first time user save to users collection
mongoose.connect("mongodb://127.0.1:27017/userDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
  useFindAndModify: false,
});

mongoose.set("useCreateIndex", true);

//checks for succesful connection
const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", function () {
  //mongoose says below code executed withing here, not so sure about that
  console.log("Database connected!");
});

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
});

//below used to hash/salt passwords, save users to mongodb
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (id, done) {
  User.findById(id, function (err, user) {
    done(err, user);
  });
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/secrets",
    },
    //google invokes this cb with user data after they are authenticated on googles servers
    function (accessToken, refreshToken, profile, cb) {
      User.findOrCreate({ googleId: profile.id }, function (err, user) {
        return cb(err, user);
      });
    }
  )
);

//route handlers
app.get("/", (req, res) => {
  res.render("home");
});

//rte for auth via google, note use of google strategy, vs local strat, no req/res callback used, wont work
//init when user clicks the register via google btn
app
  .route("/auth/google")
  .get(passport.authenticate("google", { scope: ["profile"] }));

//rte google will use after authen. the user on there side, we do local authen, and save thier login session
app.get(
  "/auth/google/secrets",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function (req, res) {
    // Successful authentication, redirect secrets.
    res.redirect("/secrets");
  }
);

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/register", (req, res) => {
  res.render("register");
});

//if authenticated/logged in, go to secrets, els loggin page
app.get("/secrets", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("secrets");
  } else {
    res.redirect("/login");
  }
});

app.get("/logout", (req, res) => {
  //here we deauthenticate user and end session
  req.logout();
  res.redirect("/");
});

//rte to register users, then sends to secrets page
app.post("/register", (req, res) => {
  const { username, password } = req.body;

  User.register({ username: username }, password, (err, newUser) => {
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      //note use of local strat, vs google strat
      passport.authenticate("local")(req, res, () => {
        res.redirect("/secrets");
      });
    }
  });
});

//rte to login users, send to secrets page when autheticated
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  const user = new User({
    username: username,
    password: password,
  });

  req.login(user, (err) => {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, () => {
        res.redirect("/secrets");
      });
    }
  });
});

app.listen(port, () => {
  console.log(`Server has started on port: ${port}.`);
});
