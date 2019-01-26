const express = require('express');
const axios = require('axios');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const db = require('../database/dbConfig');
const server = express();
const secret = 'shhhhh';

const { authenticate } = require('../auth/authenticate');

server.use(express.json());

module.exports = server => {
  server.post('/api/register', register);
  server.post('/api/login', login);
  server.get('/api/jokes', authenticate, getJokes);
};

function generateToken(user) {
  const payload = {
    username: user.username,
  };

  const options = {
    expiresIn: '1h'
  };

  return jwt.sign(payload, secret, options);
}

function register(req, res) {
  const creds = req.body;
  creds.password = bcrypt.hashSync(creds.password, 10);

  db('users')
    .insert(creds)
    .then(ids => {
      db('users')
        .where('id', ids[0])
        .first()
        .then(user => {
          const token = generateToken(user)

          res.status(201).json({id: user.id, token});
        });
    })
    .catch(err => {
      res.status(500).json({err: "server go boom"});
    })
}

function login(req, res) {
  const creds = req.body;
  db('users')
    .where('username', creds.username)
    .first()
    .then(user => {
      if (user && bcrypt.compareSync(creds.password, user.password)) {
        const token = generateToken(user)

        res.json({ id: user.id, token });
      } else {
        res.status(404).json({err: "Inavlid username or password"});
      }
    })
    .catch(err => {
      res.status(500).json({err: "server go boom"});
    })
}

function getJokes(req, res) {
  const requestOptions = {
    headers: { accept: 'application/json' },
  };

  axios
    .get('https://icanhazdadjoke.com/search', requestOptions)
    .then(response => {
      res.status(200).json(response.data.results);
    })
    .catch(err => {
      res.status(500).json({ message: 'Error Fetching Jokes', error: err });
    });
}
