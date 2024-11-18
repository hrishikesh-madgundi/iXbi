const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const flash = require('connect-flash');
const app = express();

const router = require('./router');

let sessionOptions = session({
    secret: "JS is cool",
    store: MongoStore.create({client: require('./db')}),
    resave: false,
    saveUninitialized: false,
    cookie: {maxAge: 10000*60*60, httpOnly: true}
});

app.use(sessionOptions);
app.use(flash());
app.use(function(req, res, next) {
    res.locals.errors = req.flash("errors");
    res.locals.success = req.flash("success");
    
    if (req.session.user) {
        req.visitorId = req.session.user._id;
    } else {
        req.visitorId = 0;
    }
    res.locals.user = req.session.user;
    next();
});

app.set('view engine', 'ejs');

app.use(express.static('public'));
app.use(express.urlencoded({extended: false}));
app.use(express.json());

app.use('/', router);

const server = require('http').createServer(app);

const io = require('socket.io')(server);

// Make express session data available from the server socket
io.use((socket, next) => {
    sessionOptions(socket.request, {}, next);
});

io.on('connection', (socket) => {
    if (socket.request.session.user) {
        let user = socket.request.session.user;

        socket.emit('welcome', {username: user.username, avatar: user.avatar});

        socket.on('chatMessageFromBrowser', (data) => {
            socket.broadcast.emit('chatMessageFromServer', {
                message: data.message,
                username: user.username,
                avatar: user.avatar
            });
        });
    }
});

module.exports = server;
