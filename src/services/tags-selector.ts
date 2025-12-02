import EventDispatcher from "structs/event-dispatcher";
import ImgstorDB, { ImgstorTag } from "services/imgstor-db";

interface SelectRequest {
    target: string
    origin: ImgstorTag[]
}

type SelectResponse = SelectRequest & {
    selected: ImgstorTag[]
}

type TagsSelectorEventDefinitions = {
    "TagsSelected": { deteil: SelectResponse }
    "DisplayChanged": { detail?: SelectRequest }
};
export type TagsSelectorEvent<T extends keyof TagsSelectorEventDefinitions> = TagsSelectorEventDefinitions[T];

export default class TagsSelector extends EventDispatcher<TagsSelectorEventDefinitions> {
    private db: ImgstorDB;
    private requests: SelectRequest[] = [];
    constructor(db: ImgstorDB) {
        super();
        this.db = db;
    }

    public selected(tags?: ImgstorTag[]): void {
        const { requests } = this;

        const request = requests.pop();

        if (request === undefined) {
            return;
        }

        const selected = tags || request.origin;

        this.emit("TagsSelected", { deteil: { ...request, selected } });

        if (requests.length === 0) {
            this.emit("DisplayChanged", {});
        }
        else {
            this.emit("DisplayChanged", { detail: requests[0] });
        }
    }

    public request(target: string, origin: ImgstorTag[] = []): void {
        const { requests } = this;

        requests.push({
            target,
            origin: [...origin]
        });

        if (requests.length === 1) {
            this.emit("DisplayChanged", { detail: { target, origin } });
        }

    }

    public getTags(): ImgstorTag[] {
        return this.db.GetTags();
    }

    public addTag(name: string): string {
        return this.db.InsertTag(name);
    }

    public delTag(id: string): void {
        return this.db.DeleteTag(id);
    }
}