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
    /* if (!request.session.user) {
        return response.redirect(302, "/register");
    } */

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
    console.log("????  check request.. ", "/profile");

    //checkLoginStatus
    if (!request.session.user) {
        return response.redirect(302, "/register");
    }

    const user_id = request.session.user.id;
    const firstname = request.session.user.firstname;
    const showSubMenu = true;
    console.log(firstname, user_id);
    response.render("profile", {
        user_id: user_id,
        firstname: firstname,
        showSubMenu,
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
        const showSubMenu = true;
        response.render("profile-edit", {
            // firstname: userInfo.firstname,
            // lastname: userInfo.lastname,
            // age: profileInfo.age
            //...
            ...userInfo,
            ...profileInfo,
            showSubMenu,
        });
    });
});

app.post("/profile-edit", (request, response) => {
    //checkLoginStatus
    if (!request.session.user) {
        return response.redirect(302, "/register");
    }

    //update db user table (first-, lastname, email)
    const userId = request.session.user.id;
    const { firstname, lastname, email } = request.body;
    const userUpdatePromise = database.updateUser(
        userId,
        firstname,
        lastname,
        email
    );

    //check for new pwd value and hash it
    const { password } = request.body;
    let passwordUpdatePromise;
    if (password) {
        passwordUpdatePromise = bcrypt
            .genHash(password)
            .then((hashedPassword) => {
                return database.updateUserPassword(userId, hashedPassword);
            });
    }

    //update db profile table (age, city, homepage)
    const { age, city, homepage } = request.body;
    const profilePromise = database.insertOrUpdateProfile(
        userId,
        age,
        city,
        homepage
    );

    //promise action
    Promise.all([userUpdatePromise, passwordUpdatePromise, profilePromise])
        .then((results) => {
            response.redirect(302, "profile-edit");
        })
        .catch((error) => {
            response.render("profile-edit", {
                error: "Oh, no! Something went wrong.",
                ...request.body,
            });
        });
});

app.post("/profile-delete", (request, response) => {
    //get user id from session
    const userId = request.session.user.id;

    const promiseDeleteSignature = database.deleteSignature(userId);
    const promiseDeleteProfile = database.deleteProfile(userId);
    const promiseDeleteUser = database.deleteUserAccount(userId);

    //promise action
    Promise.all([
        promiseDeleteSignature,
        promiseDeleteProfile,
        promiseDeleteUser,
    ])
        .then((results) => {
            console.log("Oh no! One user has gone away..");
            request.session = null;
            response.redirect(302, "/");
        })
        .catch((error) => {
            console.log(error);
            response.render("profile-edit", {
                error: "Oh, no! Something went wrong.",
                ...request.body,
            });
        });
});

app.get("/sign-petition", (request, response) => {
    //checkLoginStatus
    if (!request.session.user) {
        return response.redirect(302, "/register");
    }

    const userID = request.session.user.id;
    database.getSignatureForUserId(userID).then((results) => {
        const signature = results.rows[0];
        console.log("signature", signature);

        if (signature == undefined) {
            const firstname = request.session.user.firstname;
            const showSubMenu = true;
            response.render("signatureform", {
                signature: signature,
                firstname: firstname,
                showSubMenu,
            });
        } else {
            response.redirect(302, "/thank-you");
        }
    });
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

app.post("/remove-sig", (request, response) => {
    console.log("/POST route 'remove signature'");
    //remove sig from db
    const user_id = request.session.user.id;
    database.deleteSignature(user_id).then((results) => {
        //redirect to /profile-edit or something else later..
        response.redirect("/sign-petition");
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
        const firstname = request.session.user.firstname;
        const showSubMenu = true;
        console.log("signature", signature);
        response.render("thank-you", {
            signature: signature,
            firstname: firstname,
            showSubMenu,
        });
    });
});

app.get("/signers", (request, response) => {
    //get signers from database
    database.getSigners().then((results) => {
        console.log(results.rows);
        if (!request.session.user) {
            response.render("signers", {
                signers: results.rows,
            });
        } else {
            const firstname = request.session.user.firstname;
            const showSubMenu = true;
            response.render("signers", {
                signers: results.rows,
                firstname: firstname,
                showSubMenu,
            });
        }
    });
});

app.get("/credits", (request, response) => {
    if (!request.session.user) {
        response.render("credits", {});
    } else {
        const firstname = request.session.user.firstname;
        const showSubMenu = true;
        response.render("credits", {
            firstname: firstname,
            showSubMenu,
        });
    }
});

app.get("/logout", (request, response) => {
    //checkLoginStatus
    if (!request.session.user) {
        return response.redirect(302, "/register");
    }

    request.session = null;
    response.render("home");
});

app.get("/", (request, response) => {
    //checkLoginStatus
    if (request.session.user) {
        const firstname = request.session.user.firstname;
        const showSubMenu = true;
        response.render("home", {
            firstname: firstname,
            showSubMenu,
        });
    } else {
        response.render("home");
    }
});

//heroku || local
app.listen(process.env.PORT || 8080, () => {
    console.log("???????  listening..");
});
