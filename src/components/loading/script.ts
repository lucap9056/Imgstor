import EventDispatcher from "structs/event-dispatcher";

export class Loading {
    public readonly id: string;
    private manager: LoadingManager;
    constructor(manager: LoadingManager) {
        this.manager = manager;
        this.id = crypto.randomUUID();
    }

    public Remove(): boolean {
        return this.manager.Remove(this.id);
    }
}

type LoadingEventDefinitions = {
    "StatusChanged": { detail: boolean };
    "ErrorOccurred": { detail: { message: string, error: Error } };
};
export type LoadingEvent<T extends keyof LoadingEventDefinitions> = LoadingEventDefinitions[T];

export class LoadingManager extends EventDispatcher<LoadingEventDefinitions> {
    private loadMap: { [key: string]: Loading } = {};
    private state: boolean = false;

    public Append(): Loading {
        const loading = new Loading(this);

        this.loadMap[loading.id] = loading;

        this.Update();
        return loading;
    }

    public Remove(id: string): boolean {
        if (this.loadMap[id]) {
            delete this.loadMap[id];
            this.Update();
            return true;
        }

        this.Update();
        return false;
    }

    private Update(): void {
        const state = Object.keys(this.loadMap).length > 0;

        if (this.state !== state) {
            this.state = state;
            this.emit("StatusChanged", { detail: state });
        }
    }
}

const loadingManager = new LoadingManager();

export default loadingManager;