import {
    AutojoinRoomsMixin,
    LogLevel,
    LogService,
    MatrixClient,
    RichConsoleLogger,
    SimpleFsStorageProvider
} from "matrix-bot-sdk";
import * as path from "path";
import config from "./config";
import CommandHandler from "./commands/handler";
import {promises as fs} from "fs";
import { ZammadRoom } from "./rooms/room";
import { StreamRoom } from "./rooms/streamroom";
import { ZammadClient } from "./zammad/ZammadClient";

// First things first: let's make the logs a bit prettier.
LogService.setLogger(new RichConsoleLogger());

// For now let's also make sure to log everything (for debugging)
LogService.setLevel(LogLevel.INFO);

// Print something so we know the bot is working
LogService.info("index", "Bot starting...");

// Prepare the storage system for the bot
const storage = new SimpleFsStorageProvider(path.join(config.dataPath, "bot.json"));

// Create the client
const client = new MatrixClient(config.homeserverUrl, config.accessToken, storage);


// Setup the autojoin mixin (if enabled)
if (config.autoJoin) {
    AutojoinRoomsMixin.setupOnClient(client);
}

// Prepare the command handler
const commands = new CommandHandler(client);

// This is the startup closure where we give ourselves an async context
(async function () {
    const myUserId = await client.getUserId();
    const profile = await client.getUserProfile(myUserId);
    if (!profile || profile.displayname !== config.profile.displayname) {
        LogService.info("Main", "Displayname not equal to configured displayname. Setting..");
        await client.setDisplayName(config.profile.displayname);
        LogService.info("Main", "Displayname set");
    }
    if (profile && config.profile.avatar && !profile.avatar_url) {
        LogService.info("Main", "Avatar not set on profile. Setting..");
        const avatarData = await fs.readFile("./data/avatar.png");
        const mxc = await client.uploadContent(avatarData, "image/png", "avatar.png");
        await client.setAvatarUrl(mxc);
        LogService.info("Main", "Avatar set");
    }

    let rooms: {[roomId: string]: ZammadRoom} = {};
    const zammadClient = new ZammadClient(config.zammad.url, config.zammad.accessToken);
    for (const roomId of config.rooms) {
        LogService.info("Main", `Loading ${roomId}`);
        const room = new StreamRoom(roomId, client, zammadClient);
        await room.load();
        await room.listenForTickets();
        rooms[roomId] = room;
    }
    client.on("room.event", (roomId, event) => {
        if (event.type === StreamRoom.STATE_TYPE && rooms[roomId]) {
            rooms[roomId].reconfigure(event.content);
        }
    });

    await commands.start();
    LogService.info("Main", "Starting sync...");
    await client.start(); // This blocks until the bot is killed
})().catch((ex) => {
    LogService.error("Main", "Error occured:", ex);
});
