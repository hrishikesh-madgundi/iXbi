const { ObjectId } = require('mongodb'); // Import ObjectId correctly
const postsCollection = require('../db').db().collection("posts");
const User = require('./User');

let Post = function(data, userId, requestedPostId) {
    this.data = data;
    this.errors = [];
    this.userId = userId;
    this.requestedPostId = requestedPostId;
};

Post.prototype.cleanUp = function() {
    if (typeof(this.data.title) != "string") this.data.title = "";
    if (typeof(this.data.body) != "string") this.data.body = "";

    this.data = {
        title: this.data.title.trim(),
        body: this.data.body.trim(),
        createdDate: new Date(),
        author: new ObjectId(this.userId) // Correct instantiation of ObjectId
    };
};

Post.prototype.validate = function() {
    if (this.data.title == "") this.errors.push("You must provide a title.");
    if (this.data.body == "") this.errors.push("You must provide a body.");
};

Post.prototype.createPost = function() {
    return new Promise((resolve, reject) => {
        this.cleanUp();
        this.validate();

        if (!this.errors.length) {
            postsCollection.insertOne(this.data).then(info => {
                console.log("Post inserted successfully:", info.insertedId);
                resolve(info.insertedId);
            }).catch(err => {
                console.error("Database insert error:", err);
                this.errors.push("Please try again later.");
                reject(this.errors);
            });
        } else {
            console.log("Validation errors:", this.errors);
            reject(this.errors);
        }
    });
};

Post.reusablePostQuery = function(uniqueOperations, visitorId, finalOperations=[]) {
    return new Promise(async (resolve, reject) => {
        let aggOperations = uniqueOperations.concat([
            {$lookup: {from: "users", localField:"author", foreignField:"_id", as: "authorDocument"}},
            {$project: {
                title: 1,
                body: 1,
                createdDate: 1,
                authorId: "$author",
                author: {$arrayElemAt: ["$authorDocument", 0]}
            }}
        ]).concat(finalOperations);

        try {
            let posts = await postsCollection.aggregate(aggOperations).toArray();
            posts = posts.map(function(post) {
                post.isVisitorOwner = post.authorId.equals(visitorId);
                post.authorId = undefined;
                post.author = {
                    username: post.author.username,
                    avatar: new User(post.author, true).avatar
                };
                return post;
            });
            resolve(posts);
        } catch (err) {
            console.error("Error in reusablePostQuery:", err);
            reject(err);
        }
    });
};

Post.findSingleById = function(id, visitorId) {
    return new Promise(async (resolve, reject) => {
        if (typeof(id) !== 'string' || !ObjectId.isValid(id)) {
            reject("Invalid post ID.");
            return;
        }

        let posts = await Post.reusablePostQuery([
            {$match: {_id: new ObjectId(id)}} // Correct instantiation of ObjectId
        ], visitorId);

        if (posts.length) {
            resolve(posts[0]);
        } else {
            reject("Post not found.");
        }
    });
};

Post.findByAuthorId = function(authorId) {
    return new Promise(async (resolve, reject) => {
        try {
            let posts = await postsCollection.find({author: new ObjectId(authorId)}).toArray(); // Correct instantiation of ObjectId
            resolve(posts);
        } catch (err) {
            console.error("Error finding posts by author:", err);
            reject(err);
        }
    });
};

Post.prototype.actuallyUpdate = function() {
    return new Promise(async (resolve, reject) => {
        this.cleanUp();
        this.validate();
        if (!this.errors.length) {
            await postsCollection.findOneAndUpdate(
                {_id: new ObjectId(this.requestedPostId)}, // Correct instantiation of ObjectId
                {$set: {title: this.data.title, body: this.data.body}}
            );
            resolve("success");
        } else {
            reject("failure");
        }
    });
};

Post.prototype.update = function() {
    return new Promise(async (resolve, reject) => {
        try {
            let post = await Post.findSingleById(this.requestedPostId, this.userId);
            if (post.isVisitorOwner) {
                let status = await this.actuallyUpdate();
                resolve(status);
            } else {
                reject("Not the owner.");
            }
        } catch {
            reject("DB error.");
        }
    });
};

Post.delete = function(postIdToDelete, currentUserId) {
    return new Promise(async (resolve, reject) => {
        try {
            let post = await Post.findSingleById(postIdToDelete, currentUserId);
            if (post.isVisitorOwner) {
                await postsCollection.deleteOne({_id: new ObjectId(postIdToDelete)}); // Correct instantiation of ObjectId
                resolve();
            } else {
                reject("Permission denied.");
            }
        } catch (err) {
            console.error("Error in delete:", err);
            reject(err);
        }
    });
};

Post.search = function(searchTerm) {
    return new Promise(async (resolve, reject) => {
        if (typeof(searchTerm) === 'string') {
            let posts = await Post.reusablePostQuery([
                {$match: {$text: {$search: searchTerm}}},
            ], undefined, [{$sort: {score: {$meta: "textScore"}}}]);
            resolve(posts);
        } else {
            reject("Search term must be a string.");
        }
    });
};

Post.countPostsByAuthor = function(id) {
    return new Promise(async (resolve, reject) => {
        try {
            let postCount = await postsCollection.countDocuments({author: id}); // Correct instantiation of ObjectId
            resolve(postCount);
        } catch (err) {
            console.error("Error counting posts:", err);
            reject(err);
        }
    });
};

module.exports = Post;
