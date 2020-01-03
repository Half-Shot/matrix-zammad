import { ZammadClient } from "./zammad/ZammadClient";
import config from "./config";

export class PuppetFactory {
    private puppets: Map<string, ZammadClient> = new Map();

    public getPuppet(userId: string) {
        if (this.puppets.has(userId)) {
            return this.puppets.get(userId);
        }
        if (!config.sender_tokens) {
            console.log("No sender_tokens setup.");
            return null;
        }
        const token = config.sender_tokens[userId];
        if (!token) {
            console.log("No token found for user.");
            return null;
        }
        const puppet = new ZammadClient(config.zammad.url, token);
        this.puppets.set(userId, puppet);
        return puppet;
    }
}