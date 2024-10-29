const validator = require('validator');
const bcrypt = require('bcryptjs');
const md5 = require('md5');

const userCollection = require('../db').db().collection("users");

let User = function (data) {
    this.data = data;
    this.errors = [];
};

User.prototype.cleanUp = function() {
    // Ensure the fields are strings
    if (typeof(this.data.username) != "string") { this.data.username = ""; }
    if (typeof(this.data.email) != "string") { this.data.email = ""; }
    if (typeof(this.data.password) != "string") { this.data.password = ""; }
    if (typeof(this.data.profile) != "string") { this.data.profile = ""; }

    // get rid of bogus properties
    this.data = {
        username: this.data.username.trim().toLowerCase(),
        profile: this.data.profile.trim(),
        email: this.data.email.trim().toLowerCase(),
        password: this.data.password
    };
};

User.prototype.validate = function () {
    return new Promise(async (resolve, reject) => {
        // Basic validation
        if (this.data.username == "") { this.errors.push("You must provide a username."); }
        if (this.data.username != "" && !validator.isAlphanumeric(this.data.username)) { this.errors.push("Username can only contain letters and numbers."); }
        if (!validator.isEmail(this.data.email)) { this.errors.push("You must provide a valid email address."); }
        if (this.data.password == "") { this.errors.push("You must provide a password."); }
        if (this.data.password.length > 0 && this.data.password.length < 6) { this.errors.push("Password must be at least 6 characters."); }
        if (this.data.password.length > 50) { this.errors.push("Password cannot exceed 50 characters."); }
        if (this.data.username.length > 0 && this.data.username.length < 3) { this.errors.push("Username must be at least 3 characters."); }
        if (this.data.username.length > 30) { this.errors.push("Username cannot exceed 30 characters."); }

        // Check if username already exists
        if (this.data.username.length > 2 && this.data.username.length < 31 && validator.isAlphanumeric(this.data.username)) {
            let usernameExist = await userCollection.findOne({ username: this.data.username });
            if (usernameExist) { this.errors.push("Username already exists."); }
        }

        // Check if email already exists
        if (validator.isEmail(this.data.email)) {
            let emailExist = await userCollection.findOne({ email: this.data.email });
            if (emailExist) { this.errors.push("Email already exists."); }
        }

        resolve();
    });
};

User.prototype.register = function () {
    return new Promise(async (resolve, reject) => {
        // Step 1: Validate and clean up the data
        await this.cleanUp();
        await this.validate();
        
        // Step 2: Store the user in the database only if there are no validation errors
        if (this.errors.length === 0) {
            try {
                let salt = bcrypt.genSaltSync(10)
                this.data.password = bcrypt.hashSync(this.data.password, salt)
                // Inserting the user data into MongoDB
                await userCollection.insertOne(this.data);
                this.getAvatar()
                resolve("User registered successfully.");
            } catch (err) {
                reject("Error while saving the user.");
            }
        } else {
            reject(this.errors); // Return the validation errors
        }
    });
};

User.prototype.login = function() {
    return new Promise((resolve, reject) => {
        this.cleanUp();  // Cleans up user input

        userCollection.findOne({ username: this.data.username })
            .then(attemptedUser => {
                if (attemptedUser && bcrypt.compareSync(this.data.password, attemptedUser.password)) {
                    this.data = attemptedUser
                    this.getAvatar()
                    resolve("login successful");
                } else {
                    reject("Invalid user or password !");  // Rejects if the password does not match
                }
            })
            .catch(() => {
                reject("Please try again later");  // Handles server/database errors
            });
    });
};

User.prototype.getAvatar = function(){
    this.avatar = `https://gravatar.com/avatar/${md5(this.data.email)}?s=128`
}

module.exports = User;
