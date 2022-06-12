# `matrix-zammad`

A bot for forwarding Zammad ticket notifications into Matrix.

## What is Zammad?

> [Zammad](https://zammad.org/) is a web-based, open source user support/ticketing solution.

 - https://zammad.org/

## Features

- Notifies on new ticket creation in a given group

## Running / Building

```
git clone https://github.com/Half-Shot/matrix-zammad.git
```

Copy the `config/default.yaml` to `config/production.yaml` and edit as appropriate.

```
yarn
yarn build
yarn start
```

## Configuration

Beyond configuring the bot in `config/production.yaml`, you need to also configure the rooms.

The bot uses Matrix room state for configuration. To setup a room (in Riot):

- Open the room that you wish to connect the bot to.
- Invite the bot.
- Add a new state event (send `/devtools` to a room in Element) `uk.half-shot.matrix-zammad.roominfo` with the content:

```js
{
    "type": "stream",
    "pollInterval": 10000, // ms to wait between fetches for tickets.
    "groupId": 2 // The group_id you wish to fetch the tickets of. See https://docs.zammad.org/en/latest/api-group.html#list to find your group.
}
```

- Start the bot (ensuring you've added the room's roomId to the `rooms` list in the config)
- New tickets should start to be reported in the room.

## Help!

There is no help for you yet, traveller.
