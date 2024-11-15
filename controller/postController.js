const Post = require('../model/Post');

exports.viewCreatePage = (req, res) => {
    res.render('create-post');
};

exports.createPost = (req, res) => {
    if (req.session.user) {
        let post = new Post(req.body, req.session.user._id);
        post.createPost().then((newId) => {
            console.log("Redirecting to post:", newId);
            req.flash("success", "Post created successfully.");
            req.session.save(() => res.redirect(`/post/${newId}`));
        }).catch((errors) => {
            if (!Array.isArray(errors)) errors = [errors];
            errors.forEach(error => req.flash("errors", error));
            console.log("Create post errors:", errors);
            req.session.save(() => res.redirect('/create-post'));
        });
    } else {
        req.flash("errors", "You must be logged in to create a post.");
        req.session.save(() => res.redirect("/login"));
    }
};

exports.viewSingle = async (req, res) => {
    try {
        let post = await Post.findSingleById(req.params.id, req.visitorId);
        res.render('single-post-screen', {post: post});
    } catch {
        res.render('404');
    }
};

exports.viewEditScreen = async (req, res) => {
    try {
        let post = await Post.findSingleById(req.params.id, req.visitorId);
        if (post.isVisitorOwner) {
            res.render('edit-post', {post: post});
        } else {
            req.flash("errors", "You don't have permission to perform this action.");
            req.session.save(() => res.redirect("/"));
        }
    } catch {
        res.render('404');
    }
};

exports.edit = async (req, res) => {
    let post = new Post(req.body, req.visitorId, req.params.id);
    post.update().then((status) => {
        if (status == 'success') {
            req.flash('success', "Post successfully updated.");
            req.session.save(() => res.redirect(`/post/${req.params.id}/edit`));
        } else {
            post.errors.forEach(err => req.flash('errors', err));
            req.session.save(() => res.redirect(`/post/${req.params.id}/edit`));
        }
    }).catch(() => {
        req.flash('errors', "You do not have permission to perform that action.");
        req.session.save(() => res.redirect('/'));
    });
};

exports.delete = function(req, res) {
    Post.delete(req.params.id, req.visitorId).then(() => {
        req.flash("success", "Post successfully deleted.");
        req.session.save(() => res.redirect(`/profile/${req.session.user.username}`));
    }).catch(() => {
        req.flash("errors", "You do not have permission.");
        req.session.save(() => res.redirect("/"));
    });
};

exports.search = async (req, res) => {
    Post.search(req.body.searchTerm).then(posts => {
        res.json(posts);
    }).catch(() => {
        res.json([]);
    });
};
