import BaseEventSystem from "structs/eventSystem";

export class Transcode {
    private id: string;
    private transcodeLogs: TranscodeLogs;
    private state: boolean = false;
    public readonly abortController: AbortController = new AbortController();
    constructor(transcodeLogs: TranscodeLogs) {
        this.id = crypto.randomUUID();
        this.transcodeLogs = transcodeLogs;
    }

    public get Id(): string {
        return this.id;
    }

    public Remove(): void {
        const { id, transcodeLogs } = this;
        transcodeLogs.Remove(id);
    }

    public Done(): void {
        this.state = true;
    }

    public get State(): boolean {
        return this.state;
    }
}

type TranscodeLogsEventDefinitions = {
    "LogAppended": { detail: string }
    "VisibleStateChanged": { detail: boolean }
};
export type TranscodeLogsEvent<T extends keyof TranscodeLogsEventDefinitions> = TranscodeLogsEventDefinitions[T];

export default class TranscodeLogs extends BaseEventSystem<TranscodeLogsEventDefinitions> {
    private transcodeMap: { [id: string]: Transcode } = {};
    private state: boolean = false;
    public Println(msg: string): void {
        this.emit("LogAppended", { detail: msg + '\n' });
    }

    public Add(): Transcode {
        const transcode = new Transcode(this);
        this.transcodeMap[transcode.Id] = transcode;

        this.UpdateState();

        return transcode;
    }

    public Remove(id: string): void {
        const transcode = this.transcodeMap[id];

        if (transcode !== undefined) {
            delete this.transcodeMap[id];
            this.UpdateState();
        }
    }

    public Clear(): void {
        for (const id of Object.keys(this.transcodeMap)) {
            const transcode = this.transcodeMap[id];

            if (!transcode.State) {
                transcode.abortController.abort();
            }

            delete this.transcodeMap[id];
        }
        this.UpdateState();
    }

    private UpdateState(): void {
        const state = Object.keys(this.transcodeMap).length > 0;

        if (this.state !== state) {
            this.state = state;
            this.emit("VisibleStateChanged", { detail: state });
        }
    }

    public get Visibled(): boolean {
        return this.state;
    }
}