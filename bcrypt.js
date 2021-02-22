const bcrypt = require("bcryptjs");

exports.genHash = (password) => {
    return bcrypt.genSalt().then((salt) => bcrypt.hash(password, salt));
};

exports.compare = bcrypt.compare;
