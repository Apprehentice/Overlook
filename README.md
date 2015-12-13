# Overlook
A node-based multi-user chatroom service for RPGs and other activities that should be overseen.

## Design
Overlook doesn't have persistent users. A person chooses a room and a name. If the room in question does not exist, the person is made the master of that room and has the ability to mute people and see private messages sent in that room. If a person with their chosen name already exists in that room, user registration fails and the user is forced to choose another name.

## Interface
The included interface is a sample interface made with Material Design Lite. The API is generic and can be easily implemented with anything that supports WebSockets. The API was designed for web, so all user input is escaped before being relayed to other clients.
