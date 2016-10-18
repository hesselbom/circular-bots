# Circular Bots
AI Bot Battle. Write a bot and kill the other bots.

## Requirements
* node >= v6.4
* npm >= v3.10

## Install
```shell
npm install
```

## Run
```shell
node app.js
```
The server is now running on localhost:1337

## Play
Play by visiting http://localhost:1337/. There you can skip login and then select bots to fight. Or register and login to store your bots remote.

## Documentation
Create bots in `/bots` folder. Look at `/bots/SimpleBot.js` for all available options and data.

A bot can move, shoot or lay a mine. A bot can get hit by a bullet or a mine 5 times before it dies. A bullet travels at 2 pixels per frame. A bot travels at 1 pixel per frame.

### Commands
Every call to your bot's `update` method needs to return a command for what your bot should do. This can be one of the following:

#### DoNothing
Does nothing
#### Move(x, y)
Moves towards the specified direction. Move(1, 0) is right, Move(0, 1) is down, etc.
#### Shoot(x, y)
Shoots towards the specified direction.
#### Mine
Lays a mine at current position
