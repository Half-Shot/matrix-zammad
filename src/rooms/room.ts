export interface IRoomConfig {
    type: "stream",
    pollInterval: number,
    groupId: number,
}

export interface ZammadRoom {
    load: () => Promise<void>;
    reconfigure: (config: IRoomConfig, initial?: boolean) => void;
    onReaction: (sender: string, key: string, eventId: string) => void;
}