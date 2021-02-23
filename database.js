const spicedPG = require("spiced-pg");
//const db = spicedPG("postgres:martinpaetzold:@localhost:5432/petition");
//heroku || local
const db = spicedPG(
    process.env.DATABASE_URL || "postgres:florian:@localhost:5432/petition"
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

//get signers list from the database
exports.getSigners = () => {
    return db.query(`
            SELECT
                user_id, firstname, lastname
            FROM
                signatures
            FULL OUTER JOIN
                users
                ON (signatures.user_id = users.id);`);
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
