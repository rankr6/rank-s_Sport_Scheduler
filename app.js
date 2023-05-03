/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
const express = require("express");
const app = express();
var csrf = require("csurf");
var cookieParser = require("cookie-parser");
const { User, Sport, SportSession } = require("./models");
const bodyParser = require("body-parser");
const { where } = require("sequelize");
const path = require("path");
const { urlencoded, response } = require("express");
const passport = require("passport");
const connectEnsureLogin = require("connect-ensure-login");
const session = require("express-session");
const LocalStrategy = require("passport-local");
const { error, count } = require("console");
const flash = require("connect-flash");
const bcrypt = require("bcrypt");
const { request } = require("http");
const { log } = require("util");
//const { next } = require("cheerio/lib/api/traversing");
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(csrf({ cookie: true }));
app.use(
  session({
    secret: "my key super secret ",
    cookie: {
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

const saltRounds = 10;

app.set("view engine", "ejs");

app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname + "/public")));
app.use(flash());

passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    (username, password, done) => {
      User.findOne({ where: { email: username } })
        .then(async (user) => {
          const result = await bcrypt.compare(password, user.password);
          if (result) {
            return done(null, user);
          } else {
            return done(null, false, { message: "Invalid password" });
          }
        })
        .catch((error) => {
          return error;
        });
    }
  )
);

passport.serializeUser((user, done) => {
  console.log("Serializing user in session", user.id);
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  User.findByPk(id)
    .then((user) => {
      done(null, user);
    })
    .catch((error) => {
      done(error, null);
    });
});

app.use(function (request, response, next) {
  response.locals.messages = request.flash();
  next();
});

function AdminOfSport(request, response, next) {
  if (request.user && request.user.isAdmin === true) {
    return next();
  } else {
    request.flash("error", "Please login with admin user id and password.");
    response.redirect("/");
  }
}

function validateUser(req, res, next) {
  // validattte csrf
  // validate user (user email, user pass )

  console.log("hlw");
  User.findOne({ where: { email: req.body.email } })
    .then(async (user) => {
      console.log(user);
      const result = await bcrypt.compare(req.body.password, user.password);
      if (result) {
        res.cookie(`em`, user.email, {
          maxAge: 500 * 60 * 60 * 1000,
          // expires works the same as the maxAge
          secure: true,
          httpOnly: true,
        });
        res.cookie(`ps`, user.password, {
          maxAge: 500 * 60 * 60 * 1000,
          // expires works the same as the maxAge
          secure: true,
          httpOnly: true,
        });
        res.cookie(`fn`, user.firstName, {
          maxAge: 500 * 60 * 60 * 1000,
          // expires works the same as the maxAge
          secure: true,
          httpOnly: true,
        });
        console.log(result);
        next();
        //return done(null, user);
      } else {
        return done(null, false, { message: "Invalid password" });
      }
    })
    .catch((error) => {
      console.log(error);
      return error;
    });
}
app.get("/", async function (request, response) {
  const user = request.user;
  if (request.accepts("html")) {
    response.render("index", {
      user,
      csrfToken: request.csrfToken(),
    });
  } else {
    response.json({});
  }
});

app.get("/player", (request, response) => {
  response.render("player", {
    title: "player",
    csrfToken: request.csrfToken(),
  });
});

app.get("/signUp", (request, response) => {
  response.render("signup", {
    csrfToken: request.csrfToken(),
  });
});

app.get(
  "/SportList",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    try {
      const sportListInfo = await Sport.getSportName();
      const userName = await request.cookies.fn;
      console.log(sportListInfo);
      console.log(userName);
      if (request.accepts("html")) {
        response.render("SportList", {
          sportListInfo,
          userName,
          csrfToken: request.csrfToken(),
        });
      } else {
        response.json({
          userName,
          sportListInfo,
        });
      }
    } catch (error) {
      console.log(err);
    }
  }
);

app.get("/login", (request, response) => {
  response.render("login", {
    csrfToken: request.csrfToken(),
  });
});

app.post("/users", async (request, response) => {
  let isAdmin = false;
  if (request.body.isAdmin != true) {
    isAdmin = true;
  }
  if (request.body.firstName.length == 0) {
    request.flash("error", "First Name can not be empty!");
    return response.redirect("/signup");
  }
  if (request.body.email.length == 0) {
    request.flash("error", "Email address can not be empty!");
    return response.redirect("/signup");
  }
  if (request.body.password.length == 0) {
    request.flash("error", "Password can not be empty!");
    return response.redirect("/signup");
  }
  const hashedpwd = await bcrypt.hash(request.body.password, saltRounds);
  console.log(hashedpwd);
  try {
    const user = await User.create({
      firstName: request.body.firstName,
      lastName: request.body.lastName,
      email: request.body.email,
      password: hashedpwd,
      isAdmin: isAdmin,
    });
    request.login(user, (error) => {
      if (error) {
        console.log(error);
      }
      response.redirect("/admin/createSport");
    });
  } catch (error) {
    console.log(error);
  }
});

app.post(
  "/sessions",validateUser,
  passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: true,
  }),
  (request, response) => {
      response.redirect("/admin/createSport");    
  }
);

app.get("/signout", (request, response, next) => {
  request.logout((error) => {
    if (error) {
      return next(error);
    }
    response.redirect("/");
  });
});

app.get("/admin", async (request, response) => {
  const user = request.user;
  const sportName = await Sport.getSportName();
  response.render("admin/index", {
    user,
    sportName,
    csrfToken: request.csrfToken(),
  });
});

app.get(
  "/admin/createSport",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {

    try {
      const sportListInfo = await Sport.getSportName();
      const userName = request.cookies.fn;
      console.log(sportListInfo);
      if (request.accepts("html")) {
        response.render("admin/createSport", {
          sportListInfo,
          userName,
          csrfToken: request.csrfToken(),
        });
      } else {
        response.json({
          sportListInfo,
        });
      }
    } catch (error) {
      console.log(err);
    }
  }
);

app.post(
  "/admin/createSport",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    try {
      const sport = await Sport.addSport({
        SportName: request.body.SportName,
      });
      request.flash("success", "Sport has been created successfully!");
      response.redirect("/SportList");
    } catch (err) {
      console.log(err);
    }
  }
);

app.delete(
  "/admin/createSport/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    console.log("We have to delete a Sport with ID: ", request.params.id);
    try {
      await Sport.remove(request.params.id);
      return response.json({ success: true });
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
);

app.get(
  "/sessionCreate/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    const sportDetail = await Sport.perticulerSport(request.params.id);
    const userName = request.cookies.fn;
    response.render("sessionCreate", {
      userName,
      sportDetail,
      csrfToken: request.csrfToken(),
    });
  }
);

app.get(
  "/sportDetail/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    try {
      const sportDetail = await Sport.perticulerSport(request.params.id);
      const sportsession = await SportSession.getSessionDetail(
        request.params.id
      );
      const userName = request.cookies.fn;
      //console.log(sportDetail);
      console.log(sportsession);

      response.render("sportDetail", {
        userName,
        sportDetail,
        sportsession,
        csrfToken: request.csrfToken(),
      });
    } catch (err) {
      console.log(err);
    }
  }
);

app.post(
  "/sessionCreate/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    let sportId = request.params.id;
    try {
      const sportsession = await SportSession.addSession({
        date: request.body.date,
        time: request.body.time,
        place: request.body.place,
        player: request.body.player,
        TotalPlayer: request.body.TotalPlayer,
        sportId: sportId,
      });
      response.cookie(`tp`, sportsession.TotalPlayer, {
        maxAge: 500 * 60 * 60 * 1000,
        // expires works the same as the maxAge
        secure: true,
        httpOnly: true,
      });

      request.flash("success", "Session has been created successfully!");
      response.redirect("/sportDetail/" + sportId);
    } catch (err) {
      console.log(err);
    }
  }
);

app.delete(
  "/sportDetail/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    console.log("We have to delete a Sport with ID: ", request.params.id);
    try {
      await SportSession.remove(request.params.id);
      return response.json({ success: true });
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
);

/*app.get("/sportDetail/:id/joinSession", async function (request, response) {
  const sportsession = await SportSession.getSessionDetail(request.params.id);
  const sportDetail = await Sport.perticulerSport(request.params.id);
  response.render("sportDetail", {
    sportDetail,
    sportsession,
    csrfToken: request.csrfToken(),
  });
});*/

app.get(
  "/sportDetail/:id/joinSession/:sid",
  connectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    try {
      console.log("We have to add player in session id : ", request.params.id);
      const sessionId = request.params.sid;
      const sportId = request.params.id;
      const me = request.cookies.fn;
      const players = await SportSession.findOne({
        where: {
          id: sessionId,
          sportId: sportId,
        },
      });
      const TotalPlayer = request.cookies.tp;
      console.log(TotalPlayer);
      const ListPlayer = players.player;
      const splitPlayer = ListPlayer.split(",");
      const CountPlayers = splitPlayer.length;
      console.log(CountPlayers);
      //console.log(TotalPlayer);
      if (CountPlayers < TotalPlayer) {
        splitPlayer.push(me);
      } else {
        request.flash("error", "Sorry the slot is Full! ");
      }

      //const all = ListPlayer.join(",")
      //console.log(splitPlayer);
      let arrToString = splitPlayer.toString();
      await SportSession.updatePlayer({
        player: arrToString,
        id: sessionId,
      });
      const sportDetail = await Sport.perticulerSport(request.params.id);
      const sportsession = await SportSession.getSessionDetail(
        request.params.id
      );
      response.render("sportDetail", {
        sportDetail,
        sportsession,
        csrfToken: request.csrfToken(),
      });
      //  console.log(findSession.SportSession[0].dataValues.player);

      //console.log(findSession.player);

      // try {
      //   const players = await SportSession.findOne(request.params.id, {
      //     where: {
      //       player: request.body.player,
      //       TotalPlayer: request.body.TotalPlayer,
      //     },
      //   });
      //   const user = await User.findOne(request.params.id, {
      //     where: {
      //       firstName: request.cookies.fn,
      //     },
      //   });
      //   console.log( request.cookies.fn);
      //  // addMeToSessioin(myname,sessionid)
      //   if (players && user) {
      // console.log(players.player + "  " + players.TotalPlayer);
      // const ListPlayer = players.player;
      // const splitPlayer = ListPlayer.split(",");
      // console.log(splitPlayer);
      // const countPlayers = splitPlayer.count();
      //     if (countPlayers < players.TotalPlayer) {
      //       ListPlayer.push(user.firstName);
      //     }
      //   }
      //   response.redirect("/sportDetail/" + sportId);
      // } catch (error) {
      //   console.log(error);
      //   return response.status(422).json(error);
      // }
    } catch (error) {
      console.log(error);
    }
  }
);

module.exports = app;
