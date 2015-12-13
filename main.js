var server = require('http').createServer()
var url = require('url')
var clientServer = require('ws').Server
var wss = new clientServer({ server: server })
var express = require('express')
var app = express()
var port = 4080;

var escape = require('escape-html');

app.use(express.static('public'));

var UserLevel = {
  NORMAL: 0,
  MASTER: 1
}

var rooms = {}

function Room(title)
{
  this.title = title;
  this.clients = []; // Array of clients
  this.master = null;
}

wss.on('connection', function(client) {
  client.metadata = {
    registered: false,
    muted: false,
    name: "",
    room: null,
    level: UserLevel.NORMAL
  };

  client.on('message', function(message) {
    console.log('-> %s', message);

    try { var r = JSON.parse(message); }
    catch(err)
    {
      client.send(JSON.stringify({
        command: "error",
        content: "Invalid command!",
        error: err.message
      }));

      return;
    }

    switch(r.command)
    {
      case 'register':
        if (!client.metadata.registered)
        {
          if (r.room && typeof(r.room) == "string")
          {
            r.room = escape(r.room);

            if (r.name && typeof(r.name) == "string")
            {
              r.name = escape(r.name);

              if (!rooms[r.room])
              {
                rooms[r.room] = new Room(r.room);
                rooms[r.room].master = client;
                client.metadata.level = UserLevel.MASTER;
              }
              else
              {
                rooms[r.room].clients.forEach(function(c) {
                  if (c.metadata.name === r.name)
                  {
                    if (c.readyState === client.OPEN)
                      client.send(JSON.stringify({
                        command: "error",
                        content: "Registration failed: That user name already exists in that room."
                      }));
                    return;
                  }
                });
              }

              client.metadata.room = rooms[r.room];
              client.metadata.name = r.name;
              client.metadata.registered = true;

              rooms[r.room].clients.push(client);

              var rusers = [];
              client.metadata.room.clients.forEach(function(c) {
                rusers.push({ name: c.metadata.name, level: c.metadata.level, muted: c.metadata.muted });
              });

              client.send(JSON.stringify({
                command: "join",
                name: client.metadata.name,
                room: client.metadata.room.title,
                users: rusers
              }));

              client.metadata.room.clients.forEach(function(c) {
                if (c.readyState === client.OPEN)
                  c.send(JSON.stringify({
                    command: "adduser",
                    name: client.metadata.name,
                    level: client.metadata.level
                  }));
              });
            }
            else
            {
              client.send(JSON.stringify({
                command: "error",
                content: "Registration failed: Invalid user name."
              }));
            }
          }
          else
          {
            client.send(JSON.stringify({
              command: "error",
              content: "Registration failed: Invalid room name."
            }));
          }
        }
        else
        {
          client.send(JSON.stringify({
            command: "error",
            content: "Registration failed: You are already registered"
          }));
        }
        break;
      case 'message':
        if (client.metadata.registered && !client.metadata.muted)
        {
          if (r.target)
          {
            var target = null;
            client.metadata.room.clients.forEach(function(c) {
              if (c.metadata.name === r.target)
              {
                target = c;
              }
            });

            if (target)
            {
              client.send(JSON.stringify({
                command: "message",
                author: client.metadata.name,
                target: target.metadata.name,
                content: escape(r.content)
              }));

              target.send(JSON.stringify({
                command: "message",
                author: client.metadata.name,
                target: target.metadata.name,
                content: escape(r.content)
              }));

              if (target != client.metadata.room.master)
                client.metadata.room.master.send(JSON.stringify({
                  command: "message",
                  author: client.metadata.name,
                  target: target.metadata.name,
                  content: escape(r.content)
                }));
            }
            else
            {
              client.send(JSON.stringify({
                command: "error",
                content: "Message could not be sent: Invalid user",
              }));
            }
          }
          else
          {
            client.metadata.room.clients.forEach(function(c) {
              if (c.readyState === client.OPEN)
                c.send(JSON.stringify({
                  command: "message",
                  author: client.metadata.name,
                  target: "",
                  content: escape(r.content)
                }));
            });
          }
        }
        else if (client.metadata.registered)
        {
          client.send(JSON.stringify({
            command: "error",
            content: "Message could not be sent: You are muted",
          }));
        }
        else
        {
          client.send(JSON.stringify({
            command: "error",
            content: "Message could not be sent: You are not registered",
          }));
        }
        break;
      case 'mute':
        if (client.metadata.level === UserLevel.MASTER)
        {
          if (r.target)
          {
            var target = null;
            client.metadata.room.clients.forEach(function(c) {
              if (c.metadata.name === r.target)
              {
                target = c;
              }
            });

            if (target)
            {
              target.metadata.mute = r.muted;
              client.metadata.room.clients.forEach(function(c) {
                if (c.readyState === client.OPEN)
                  c.send(JSON.stringify({
                    command: "mute",
                    target: target.metadata.name,
                    muted: r.muted
                  }));
              });
            }
            else
            {
              client.send(JSON.stringify({
                command: "error",
                content: "User could not be muted: Invalid user",
              }));
            }
          }
          else
          {
            client.send(JSON.stringify({
              command: "error",
              content: "User could not be muted: No user specified",
            }));
          }
        }
        break;
      default:
        client.send(JSON.stringify({
          command: "error",
          content: "Invalid command!"
        }));
        break;
    }
  });

  client.on('close', function() {
    if (client.metadata.registered)
    {
      var room = client.metadata.room;

      room.clients.forEach(function(c) {
        if (c.readyState === client.OPEN)
          c.send(JSON.stringify({
            command: "removeuser",
            name: client.metadata.name
          }));
      });

      var index = room.clients.indexOf(client);
      if (index > -1)
        room.clients.splice(index, 1);

      if (!room.clients[0])
        delete rooms[room.title];
    }
  });

  client.on('error', function(err) {
    console.error(err.name + ': ' + err.message);
  });
});

server.on('request', app);
server.listen(port, function () { console.log('Listening on ' + server.address().port) });
