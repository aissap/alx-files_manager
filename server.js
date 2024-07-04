// server.js

const express = require('express');
const dotenv = require('dotenv');
const AppController = require('./controllers/AppController');
const routes = require('./routes');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

app.use('/', routes);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});