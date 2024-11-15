const followsCollection = require('../db').db().collection('follows')
const usersCollection = require('../db').db().collection('users')
const ObjectId = require('mongodb').ObjectId // Corrected here
const User = require('./User')

let Follow = function(followedUsername, authorId){
    this.followedUsername = followedUsername
    this.authorId = authorId
    this.errors = []
}

Follow.prototype.cleanUp = function(){
    if (typeof(this.followedUsername) != "string") { this.followedUsername = "" }
}

Follow.prototype.validate = async function(action){
    let followedAccount = await usersCollection.findOne({ username: this.followedUsername })
    if (followedAccount) {
        this.followedId = followedAccount._id
    } else {
        this.errors.push("Cannot follow a user that doesn't exist")
    }

    let doesFollowAlreadyExist = await followsCollection.findOne({ followedId: this.followedId, authorId: new ObjectId(this.authorId) })
    if (action == "follow") {
        if (doesFollowAlreadyExist) { this.errors.push("You are already following this user") }
    }
    if (action == "unfollow") {
        if (!doesFollowAlreadyExist) { this.errors.push("You are already not following this user") }
    }

    if (this.followedId.equals(this.authorId)) { this.errors.push("You cannot follow yourself") }
}

Follow.prototype.create = function(){
    return new Promise(async (resolve, reject) => {
        this.cleanUp()
        await this.validate("follow")
        if (!this.errors.length) {
            await followsCollection.insertOne({ followedId: this.followedId, authorId: new ObjectId(this.authorId) })
            resolve()
        } else {
            reject(this.errors)
        }
    })
}

Follow.isVisitorFollowing = async function(followedId, visitorId) {
    let followDoc = await followsCollection.findOne({ followedId: followedId, authorId: new ObjectId(visitorId) })
    return followDoc ? true : false
}

Follow.prototype.delete = function(){
    return new Promise(async (resolve, reject) => {
        this.cleanUp()
        await this.validate("unfollow")
        if (!this.errors.length) {
            await followsCollection.deleteOne({ followedId: this.followedId, authorId: new ObjectId(this.authorId) })
            resolve()
        } else {
            reject(this.errors)
        }
    })
}

Follow.getFollowersById = function(id){
    return new Promise(async (resolve, reject) => {
        try {
            let followers = await followsCollection.aggregate([
                { $match: { followedId: id } },
                { $lookup: { from: "users", localField: "authorId", foreignField: "_id", as: "userDoc" } },
                { $project: {
                    username: { $arrayElemAt: ["$userDoc.username", 0] },
                    email: { $arrayElemAt: ["$userDoc.email", 0] }
                }}
            ]).toArray()
            followers = followers.map(follower => {
                let user = new User(follower, true)
                return { username: follower.username, avatar: user.avatar }
            })
            resolve(followers)
        } catch {
            reject("Error in follow model")
        }
    })
}

Follow.getFollowingById = function(id){
    return new Promise(async (resolve, reject) => {
        try {
            let following = await followsCollection.aggregate([
                { $match: { authorId: id } },
                { $lookup: { from: "users", localField: "followedId", foreignField: "_id", as: "userDoc" } },
                { $project: {
                    username: { $arrayElemAt: ["$userDoc.username", 0] },
                    email: { $arrayElemAt: ["$userDoc.email", 0] }
                }}
            ]).toArray()
            following = following.map(follower => {
                let user = new User(follower, true)
                return { username: follower.username, avatar: user.avatar }
            })
            resolve(following)
        } catch {
            reject("Error in follow model")
        }
    })
}

Follow.countFollowersById = function(id){
    return new Promise(async (resolve, reject) => {
        try {
            let followerCount = await followsCollection.countDocuments({ followedId: id })
            resolve(followerCount)
        } catch {
            reject("Error counting followers")
        }
    })
}

Follow.countFollowingById = function(id){
    return new Promise(async (resolve, reject) => {
        try {
            let followingCount = await followsCollection.countDocuments({ authorId: id })
            resolve(followingCount)
        } catch {
            reject("Error counting following")
        }
    })
}

module.exports = Follow
