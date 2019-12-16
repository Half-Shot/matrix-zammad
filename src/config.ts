import * as config from "config";

interface IConfig {
    homeserverUrl: string;
    accessToken: string;
    autoJoin: boolean;
    dataPath: string;
    profile: {
        displayname: string;
        avatar?: boolean;
    }
    zammad: {
        url: string;
        accessToken: string;
    }
    rooms: string[];
}

export default <IConfig>config;
