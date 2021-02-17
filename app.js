require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const saltRounds = 10;

const port = process.env.PORT || 3000;

const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));

//userDB and users collection first appear first time user save to users collection
mongoose.connect("mongodb://127.0.1:27017/userDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
  useFindAndModify: false,
});

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
});

const User = new mongoose.model("User", userSchema);

//route handlers
app.get("/", (req, res) => {
  res.render("home");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/register", (req, res) => {
  res.render("register");
});

//rte to register users, then sends to secrets page
app.post("/register", (req, res) => {
  const { username, password } = req.body;

  bcrypt.hash(password, saltRounds, (err, hash) => {
    if (err) {
      return console.error(err);
    }

    const newUser = new User({
      email: username,
      password: hash,
    });

    newUser.save((err) => {
      if (err) {
        return console.error(err);
      }
      //secrets only rendered if registered or logged in
      res.render("secrets");
    });
  });
});

//rte to login users, send to secrets page when autheticated
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  User.findOne({ email: username }, (err, foundUser) => {
    if (err) {
      return console.error(err);
    }

    if (foundUser) {
      bcrypt.compare(password, foundUser.password, (err, result) => {
        if (err) {
          return console.error(err);
        }

        if (result) {
          res.render("secrets");
        } else {
          res.send("Incorrect password.");
        }
      });
    } else {
      res.send("User not found.");
    }
  });
});

app.listen(port, () => {
  console.log(`Server has started on port: ${port}.`);
});

/*
Because many plugins rely on middleware, you should make sure to apply plugins before you call mongoose.model() or conn.model(). Otherwise, any middleware the plugin registers won't get applied.
//do below before calling new mongoose.model(), note enviroment var SECRET
userSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: ['password'] });
*/
