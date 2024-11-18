const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');
dotenv.config();

const url = process.env.URL;

const connectToDb = async () => {
    try {
        const client = await MongoClient.connect(url); // Removed deprecated options
        console.log("db connected...");
        return client;
    } catch (err) {
        console.error("Failed to connect to the database", err);
        throw err; // Throwing an error so the app doesn't proceed without DB connection
    }
};

// Call the connectToDb function and start the app
connectToDb().then(client => {
    module.exports = client; // Export the db client after successful connection

    const app = require('./app');
    app.listen(process.env.PORT, () => {
        console.log("listening on 8000...");
    });
}).catch(err => {
    console.error("Could not start the app", err);
});