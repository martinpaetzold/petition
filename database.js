const spicedPG = require("spiced-pg");
//const db = spicedPG("postgres:martinpaetzold:@localhost:5432/petition");
//heroku || local
const db = spicedPG(
    process.env.DATABASE_URL ||
        "postgres:martinpaetzold:@localhost:5432/petition"
);

//supposed to add a signature to the database
exports.addSignature = (userId, signatureCode) => {
    return db.query(
        `INSERT INTO signatures
            (user_id, signature_code)
            VALUES ($1, $2)
            RETURNING *;`,
        [userId, signatureCode]
    );
};

//add profile information
exports.addProfile = (userId, age, city, homepage) => {
    return db.query(
        `
    INSERT
        INTO profiles
        (user_id, age, city, homepage)
    VALUES ($1, $2, $3, $4);
    `,
        [userId, age, city, homepage]
    );
};

//get user information
exports.getUser = (userId) => {
    return db.query("SELECT * FROM users WHERE id=$1;", [userId]);
};

//get profile from current user
exports.getProfileForUserId = (userId) => {
    return db.query("SELECT * FROM profiles WHERE user_id = $1;", [userId]);
};

//update existing profile data (!only first-, lastname, email)
exports.updateUser = (userId, firstname, lastname, email) => {
    return db.query(
        `
        UPDATE users
        SET
            firstname=$1,
            lastname=$2,
            email=$3
        WHERE id=$4;
    `,
        [firstname, lastname, email, userId]
    );
};

//user wants to change password. time to hash it.
exports.updateUserPassword = (userId, passwordHash) => {
    return db.query(
        `
        UPDATE users
            SET password_hash=$1
        WHERE id=$2;
    `,
        [passwordHash, userId]
    );
};

//adding or update additional profile data (!only age, city, homepage)
exports.insertOrUpdateProfile = (userId, age, city, homepage) => {
    return db.query(
        `
        INSERT INTO profiles
            (user_id, age, city, homepage)
        VALUES
            ($1, $2, $3, $4)
        ON CONFLICT(user_id) DO
            UPDATE
                SET age=$2,
                city=$3,
                homepage=$4;
    `,
        [userId, age, city, homepage]
    );
};

//get signers list from the database
exports.getSigners = () => {
    return db.query(`
            SELECT
                firstname, lastname, email, age, city, homepage
            FROM
                signatures
            JOIN
                users
            ON
                (signatures.user_id = users.id)
            JOIN
                profiles
            ON
                (profiles.user_id = users.id);`);
};

//get signature from user (id)
exports.getSignatureForUserId = (userId) => {
    return db.query("SELECT * FROM signatures WHERE user_id=$1;", [userId]);
};

//get signature & firstname from user (id)
exports.getNameAndSignature = (userId) => {
    return db.query(
        "SELECT * FROM users FULL OUTER JOIN signatures ON signatures.user_id = users.id WHERE user_id=$1;",
        [userId]
    );
};

//get signature from the already signed user
exports.getSignature = (id) => {
    return db.query("SELECT * FROM signatures WHERE id=$1;", [id]);
};

//register user to the database
exports.addUser = (firstname, lastname, email, password) => {
    return db.query(
        `INSERT INTO users (firstname, lastname, email, password_hash)
                        VALUES ($1,$2,$3,$4) RETURNING id, firstname, lastname`,
        [firstname, lastname, email, password]
    );
};

//get user(id) by e-mail
exports.getUserByEmail = (emailAddress) => {
    return db.query("SELECT * FROM users WHERE email=$1;", [emailAddress]);
};
