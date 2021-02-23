const express = require("express");
const hb = require("express-handlebars");
const cookieParser = require("cookie-parser");
const cookieSession = require("cookie-session");
const csurf = require("csurf");
const database = require("./database.js");
const bcrypt = require("./bcrypt.js");
const app = express();

app.engine("handlebars", hb());
app.set("view engine", "handlebars");

app.use(express.static("static"));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(
    cookieSession({
        maxAge: 1000 * 60 * 60 * 24 * 30,
        secret: "s%3A235qwerty$lkjhgfdsa",
    })
);

//middleware CSRF token
app.use(csurf());

app.use((request, response, next) => {
    response.locals.csrfToken = request.csrfToken();
    next();
});

app.get("/register", (request, response) => {
    response.render("register");
});

app.post("/register", (request, response) => {
    // 1.validation of user input
    //destructering
    const { firstname, lastname, email, password } = request.body;

    if (!firstname || !lastname || !email || !password) {
        response.render("register", {
            error: "Please, fill out all input fields!",
            firstname: firstname,
            lastname: lastname,
        });
    } else {
        // 2.hash the password
        bcrypt
            .genHash(password)
            .then((hashedPassword) => {
                // 3.store the hashed password and user data into db
                database
                    .addUser(firstname, lastname, email, hashedPassword)
                    .then((userData) => {
                        // 5.store user info/data in the session
                        request.session.user = userData.rows[0];
                        // 6.redirect to ("/profile"-Route)
                        response.redirect(302, "/profile");
                    })
                    .catch((error) => {
                        // 4. if e-mail exists already in db, re-render template with error message
                        console.log(error);
                        response.render("register", {
                            error:
                                "Something went wrong with your email or password",
                            firstname,
                            lastname,
                        });
                    });
            })
            .catch((error) => console.log(error));
    }
});

app.get("/login", (request, response) => {
    //checkLoginStatus
    if (!request.session.user) {
        return response.redirect(302, "/register");
    }

    response.render("login");
});

app.post("/login", (request, response) => {
    // 1.check if user fill out fields
    const { email, password } = request.body;
    if (!email || !password) {
        return response.render("login", {
            error: "Please fill out all fields.",
        });
    } else {
        // 2.load user with this email address from db
        //react to not existing user
        database.getUserByEmail(email).then((results) => {
            if (results.rows.length == 0) {
                //NO user found with this email address
                return response.render("login", {
                    error: "Email and password not correct..",
                });
            }
            // 3.compare passwords
            const user = results.rows[0];
            bcrypt.compare(password, user.password_hash).then((valid) => {
                if (!valid) {
                    return response.render("login", {
                        error: "Email and password not correct.",
                    });
                }
                // 4.write user info to session
                request.session.user = user;
                // 5.set new cookie firstname
                console.log(user);
                //const { firstname, user_id } = user;
                //console.log(firstname);
                //response.cookie("firstname", firstname);
                // 6.set new cookie login true
                response.cookie("login", true);
                //
                console.log("Cookies: ", request.cookies);
                // check if signed: true
                // 7.redirect user to /thank-you or /sign-petition
                if (request.cookies.signed == "true") {
                    response.redirect(302, "/thank-you");
                } else {
                    response.redirect(302, "/sign-petition");
                }
            });
        });
    }
});

app.get("/profile", (request, response) => {
    console.log("🐢  check request.. ", "/profile");

    //checkLoginStatus
    if (!request.session.user) {
        return response.redirect(302, "/register");
    }

    const user_id = request.session.user.id;
    const firstname = request.session.user.firstname;
    console.log(firstname, user_id);
    response.render("profile", {
        user_id: user_id,
        firstname: firstname,
    });
});

app.post("/profile", (request, response) => {
    // 1.check if age and city put in
    const { age, city, homepage } = request.body;
    if (!age || !city) {
        return response.render("profile", {
            error: "Please fill out city and age.",
            age,
            city,
            homepage,
        });
    }

    // 2.store profile data in db
    const user_id = request.session.user.id;
    database.addProfile(user_id, age, city, homepage).then((results) => {
        // 3.redirect to /sign-petition
        response.redirect("/sign-petition");
    });
});

app.get("/profile-edit", (request, response) => {
    //checkLoginStatus
    if (!request.session.user) {
        return response.redirect(302, "/register");
    }

    const userId = request.session.user.id;
    Promise.all([
        database.getUser(userId),
        database.getProfileForUserId(userId),
    ]).then((results) => {
        const userInfo = results[0].rows[0];
        const profileInfo = results[1].rows[0];
        response.render("profile-edit", {
            // firstname: userInfo.firstname,
            // lastname: userInfo.lastname,
            // age: profileInfo.age
            //...
            ...userInfo,
            ...profileInfo,
        });
    });
});

app.get("/sign-petition", (request, response) => {
    //checkLoginStatus
    if (!request.session.user) {
        return response.redirect(302, "/register");
    }

    response.render("signatureform");
});

app.post("/sign-petition", (request, response) => {
    // Save signature to the database, if values exists
    const signatureCode = request.body.signature_code;
    const user_id = request.session.user.id;

    console.log(user_id, signatureCode);

    database
        .addSignature(user_id, signatureCode)
        .then((result) => {
            // Redirect to thank-you page
            response.redirect(302, "/thank-you");
        })
        .catch((error) => {
            console.log(error);
            response.send(
                "Unfortunatelly we cannot save your signature right now. Please try again in 45 minutes."
            );
        });
});

app.get("/thank-you", (request, response) => {
    //checkLoginStatus
    if (!request.session.user) {
        return response.redirect(302, "/register");
    }

    //get the signature from the db
    const userID = request.session.user.id;
    database.getNameAndSignature(userID).then((results) => {
        const signature = results.rows[0];
        console.log("signature", signature);
        response.render("thank-you", {
            signature: signature,
        });
    });
});

app.get("/signers", (request, response) => {
    //get signers from database
    database.getSigners().then((results) => {
        console.log(results.rows);
        response.render("signers", {
            signers: results.rows,
        });
    });
});

app.get("/logout", (request, response) => {
    //checkLoginStatus
    if (!request.session.user) {
        return response.redirect(302, "/register");
    }

    //console.log("Ready to logout...");
    if (request.cookies.login == "true") {
        //let test123 = request.cookies.login;
        //console.log(test123);
        response.cookie("login", false);
        response.redirect(302, "/");
    } else {
        response.redirect(302, "/");
    }
});

app.get("/", (request, response) => {
    //checkLoginStatus
    if (request.session.user) {
        const firstname = request.session.user.firstname;
        response.render("home", {
            firstname: firstname,
            login: true,
        });
    } else {
        response.render("home");
    }
});

//heroku || local
app.listen(process.env.PORT || 8080, () => {
    console.log("🛰️  listening..");
});
