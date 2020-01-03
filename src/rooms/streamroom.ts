import { ZammadRoom, IRoomConfig } from "./room";
import { MatrixClient, LogService } from "matrix-bot-sdk";
import { ZammadClient, IZammadTicket } from "../zammad/ZammadClient";
import { PuppetFactory } from "../puppetFactory";


const MIN_POLL_INTERVAL = 10000;
const DEFAULT_POLL_INTERVAL = 30000;

export class StreamRoom implements ZammadRoom {
    public static STATE_TYPE = "uk.half-shot.matrix-zammad.roominfo";
    public static STATE_HEAD_TYPE = "uk.half-shot.matrix-zammad.sync_head";

    private config: IRoomConfig;
    private lastNewTicketId = 0;
    constructor(public readonly roomId: string, private readonly client: MatrixClient,
        private readonly zammad: ZammadClient, private readonly puppetFactory: PuppetFactory) {

    }

    public async load() {
        await this.client.joinRoom(this.roomId); // Ensure joined.
        try {
            const config = await this.client.getRoomStateEvent(this.roomId, StreamRoom.STATE_TYPE, "");
            this.reconfigure(config, true);
        } catch (ex) {
            if (ex.body.errcode === "M_NOT_FOUND") {
                throw Error("No config state found");
            }
            throw ex;
        }
        try {
            const data = await this.client.getRoomAccountData(this.roomId, StreamRoom.STATE_HEAD_TYPE);
            this.lastNewTicketId = data.lastNewTicketId;
            LogService.info("StreamRoom", `Setting sync head to ${this.lastNewTicketId} for ${this.roomId}`);
        } catch (ex) {
            if (ex.body.errcode === "M_NOT_FOUND") {
                return;
            }
            throw ex;
        }
    }

    public reconfigure(config: IRoomConfig, initial = false) {
        LogService.info("StreamRoom", `Configuring ${this.roomId}`);
        config.pollInterval = Math.max(MIN_POLL_INTERVAL, config.pollInterval || DEFAULT_POLL_INTERVAL);
        this.config = config;
    }

    public async listenForTickets() {
        await this.ticketPoll(true);
        setInterval(() => {
            this.ticketPoll().catch((ex) => {
                LogService.warn("StreamRoom", `Failed to poll for tickets: ${ex}`);
            })
        }, this.config.pollInterval);
    }

    public async onReaction(sender: string, key: string, eventId: string) {
        const puppet = this.puppetFactory.getPuppet(sender);
        if (!puppet) {
            return;
        }
        const actionAliases = {
            "close": ["❌", "🚮"]
        }
        const action = Object.keys(actionAliases).find((act) => actionAliases[act].includes(key));

        if (!action) {
            LogService.info("StreamRoom", `Did not understand reaction key ${key}`);
            return;
        }

        try {
            const event = await this.client.getEvent(this.roomId, eventId);
            const ticket = event.content["uk.half-shot.zammad.ticket"];
            if (!ticket || ticket.number) {
                LogService.info("StreamRoom", `Reaction was not made against a ticket`);
                return;
            }
            if (action === "close") {
                try {
                    LogService.info("StreamRoom", `Attempting to close ticket ${ticket.number}`);
                    await puppet.closeTicket(ticket.id);
                    await this.client.sendNotice(this.roomId, `Closed #${ticket.number}`);
                } catch (ex) {
                    await this.client.sendNotice(this.roomId, `Failed to close ticket ${ticket.number}: ${ex}`);
                }
            }
        } catch (ex) {
            LogService.warn("StreamRoom", `Could not get referenced event: ${eventId}`);
            return;
        }
    }

    private async ticketPoll(initial = false) {
        LogService.info("StreamRoom", `Polling for tickets`);
        const tickets = await this.zammad.getTickets(this.config.groupId);
        for (const ticket of tickets.sort((a, b) => a.id - b.id)) {
            if (ticket.id > this.lastNewTicketId) {
                LogService.info("StreamRoom", `Found new ticket ${ticket.id}`);
                this.lastNewTicketId = ticket.id;
                if (initial) {
                    continue;
                }
                await this.handleNewTicket(ticket);
                await this.updateSyncHead();
            }
        }
        LogService.info("StreamRoom", `Finished polling`);
    }

    private async handleNewTicket(ticket: IZammadTicket) {
        return this.client.sendMessage(this.roomId, {
            "uk.half-shot.zammad.ticket": {
                number: ticket.number,
                id: ticket.id,
            },
            msgtype: "m.notice",
            body: `New Ticket #${ticket.number}: ${ticket.title}`,
            format: "org.matrix.custom.html",
            formatted_body: `<b>New Ticket</b> <a href="${this.zammad.url}/#ticket/zoom/${ticket.id}">#${ticket.number}</a>:<p>${ticket.title}</p>`,
        });
    }

    private async updateSyncHead() {
        LogService.info("StreamRoom", `Setting sync head to ${this.lastNewTicketId} for ${this.roomId}`);
        return this.client.setRoomAccountData(StreamRoom.STATE_HEAD_TYPE, this.roomId, {
            "ticket_id": this.lastNewTicketId,
        });
    }
}