const { ObjectId } = require("mongodb"); // Correct ObjectId import
const postsCollection = require('../db').db().collection("posts");
const User = require('./User')

let Post = function (data, userId) {
    this.data = data;
    this.errors = [];
    this.userId = userId;
};

Post.prototype.cleanUp = function () {
    if (typeof(this.data.title) !== "string") { this.data.title = ""; }
    if (typeof(this.data.body) !== "string") { this.data.body = ""; }

    // Clean and format the data
    this.data = {
        title: this.data.title.trim(),
        body: this.data.body.trim(),
        createdDate: new Date(),
        author: new ObjectId(this.userId)
    };
};

Post.prototype.validate = function () {
    return new Promise((resolve, reject) => {
        if (this.data.title === "") { this.errors.push("You must provide a title."); }
        if (this.data.body === "") { this.errors.push("You must provide post content."); }

        if (!this.errors.length) {
            resolve();
        } else {
            reject(this.errors);
        }
    });
};

Post.prototype.createPost = async function() {
    try {
        this.cleanUp();
        this.validate();
        
        if (this.errors.length) {
            throw this.errors;
        }

        const info = await postsCollection.insertOne(this.data);
        return info.insertedId;
        
    } catch (error) {
        if (Array.isArray(error)) {
            throw error; // Rethrow validation errors
        }
        this.errors.push("Please try again later...");
        throw this.errors;
    }
};

Post.findSingleById = function(id) {
    return new Promise(async (resolve, reject) => {
        if (typeof(id) !== 'string' || !ObjectId.isValid(id)) {
            reject("Invalid ID format");
            return;
        }

        try {
            let posts = await postsCollection.aggregate([
                { $match: { _id: new ObjectId(id) } },
                { 
                    $lookup: {
                        from: "users", 
                        localField: "author", 
                        foreignField: "_id", 
                        as: "authorDocument"
                    }
                }
            ]).toArray();
            
            if (posts.length) {
                resolve(posts[0]);
            } else {
                reject("Post not found");
            }
        } catch (error) {
            reject(error);
        }
    });
};

module.exports = Post;