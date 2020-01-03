import * as request from "request-promise-native";

export interface IZammadTicket {
    id: number,
    title: string,
    group_id: number,
    state_id: number,
    customer_id: number,
    customer: string;
    note: string,
    updated_at: number,
    created_at: number,
    number: string,
}

export interface IZammadUser {
    id: number;
    firstname: string;
    lastname: string;
    email: string;
}

export class ZammadClient {
    constructor(public readonly url: string, private readonly accessToken: string) {
        while (this.url.endsWith("/")) {
            this.url = this.url.substr(0, this.url.length - 1);
        }
    }

    public async getTickets(groupId: number): Promise<IZammadTicket[]> {
        const uri = `${this.url}/api/v1/tickets/search?query=group_id:${groupId}&limit=20&expand=true&order_by=desc&sort_by=number`;
        const result = await request.get(uri, {
            headers: {
                "Authorization": `Token token=${this.accessToken}`,
            },
            json: true,
        });
        return result.map((t) => {
            return {
                ...t,
                updated_at: Date.parse(t.updated_at),
                created_at: Date.parse(t.created_at),
            }
        });
    }

    public async getTicket(id: number): Promise<IZammadTicket> {
        const uri = `${this.url}/api/v1/tickets/${id}`;
        return request.get(uri, {
            headers: {
                "Authorization": `Token token=${this.accessToken}`,
            },
            json: true
        });
    }

    public async closeTicket(id: number) {
        const ticket = await this.getTicket(id);
        // XXX: Hardcoded state
        ticket.state_id = 4;
        const uri = `${this.url}/api/v1/tickets/${id}`;
        const result = await request.put(uri, {
            headers: {
                "Authorization": `Token token=${this.accessToken}`,
            },
            json: ticket,
        });
        return result;
    }

    public async getUser(userId: number): Promise<IZammadUser> {
        const uri = `${this.url}/api/v1/users/${userId}`;
        return request.get(uri, {
            headers: {
                "Authorization": `Token token=${this.accessToken}`,
            },
            json: true,
        });
    }
}