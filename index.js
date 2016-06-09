'use strict';

var Hapi = require('hapi');
var Boom = require('boom');
var path = require('path');
var _ = require('lodash');
var MongoClient = require('mongodb').MongoClient;

// Connection URL
var url = 'mongodb://localhost:27017/tizen';

// Create a server with a host and port
var server = new Hapi.Server();
server.connection({ 
  host: 'localhost', 
  port: 8000,
});

var states = {
  cloudy: 'nuage',
  stormy: 'orage',
  rainy: 'pluie',
  sunny: 'soleil',
};

var defineState = function(total) {
  if (total < 0) {
    return states.stormy;
  }

  if (total < 500) {
    return states.rainy;
  }

  if (total < 1000) {
    return states.cloudy;
  }

  return states.sunny;
};

// Add the route
server.route({
  method: 'GET',
  path: '/me', 
  handler: function (request, reply) {
    var collection = request.server.db.collection('users');

    if (!request.query.token) {
      return reply(Boom.unauthorized('No valid token found, please register at: /register'));
    }

    var user = collection.findOne({token: request.query.token}).then(function(user) {
      if (!user) {
        return reply(Boom.unauthorized('No user found, please register at: /register'));
      }

      var total = _.random(-500, 2000);
      var accountState = defineState(total);

      return reply({
        msg: 'hello me with token ' + request.query.token,
        username: user.username,
        accountState: '/img/' + accountState + '.jpg',
        total: total,
      });
    });
  },
});

server.route({
  method: 'POST',
  path: '/register',
  handler: function(request, reply) {
    var collection = request.server.db.collection('users');
    collection.insertOne(request.payload).then(function() {
      reply.redirect('/me?token=' + request.payload.token);
    });
  },
});

server.register(require('inert'), function(err) {
  if (err) {
    throw err;
  }

  server.route({
    method: 'GET',
    path: '/register',
    handler: {
      file: path.resolve(__dirname, 'index.html'),
    },
  });

  server.route({
    method: 'GET',
    path: '/img/{param*}',
    handler: {
      directory: {
        path: path.resolve(__dirname, 'meteo'),
      },
    },
  });

  // Start the server

  // Use connect method to connect to the server
  MongoClient.connect(url, function(err, db) {
    if (err) {
      throw err;
    }
    server.db = db;
    console.log('Connected succesfully to server');

    server.on('stop', function() {
      console.log('Closed succesfully connection to server');
      db.close();
    });

    server.start(function(err) {
      if (err) {
        throw err;
      }
      console.log('Server running at:', server.info.uri);
    });
  });
});
