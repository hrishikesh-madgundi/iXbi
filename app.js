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
})

app.use(sessionOptions)
app.use(flash())
app.use(function(req, res, next){
    res.locals.user = req.session.user
    next()
})

app.set('view engine', 'ejs');

app.use(express.static('public'))
app.use(express.urlencoded({extended:false}));
app.use(express.json())

app.use('/', router)

module.exports = app;