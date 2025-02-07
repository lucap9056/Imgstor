import BaseEventSystem from "structs/eventSystem";
import ImgstorDB, { ImgstorTag } from "./imgstor-db";

interface SelectRequest {
    target: string
    tags: ImgstorTag[]
    old_tags: ImgstorTag[]
}

type TagsSelecterEventDefinitions = {
    "TagsSelected": { deteil: SelectRequest }
    "DisplayChanged": { detail?: SelectRequest }
};
export type TagsSelecterEvent<T extends keyof TagsSelecterEventDefinitions> = TagsSelecterEventDefinitions[T];

export default class TagsSelecter extends BaseEventSystem<TagsSelecterEventDefinitions> {
    private db: ImgstorDB;
    private requests: SelectRequest[] = [];
    constructor(db: ImgstorDB) {
        super();
        this.db = db;
    }

    public Selected(tags?: ImgstorTag[]): void {
        const { requests } = this;

        const request = requests.pop();

        if (request === undefined) {
            return;
        }

        if (tags !== undefined) {
            request.tags = tags;
        }

        this.emit("TagsSelected", { deteil: request });

        if (requests.length === 0) {
            this.emit("DisplayChanged", {});
        }
        else {
            this.emit("DisplayChanged", { detail: requests[0] });
        }
    }

    public Request(target: string, old_tags: ImgstorTag[] = []): void {
        const { requests } = this;

        const request: SelectRequest = { target, tags: old_tags, old_tags };
        requests.push(request);

        if (requests.length === 1) {
            this.emit("DisplayChanged", { detail: request });
        }

    }

    public GetTags(): ImgstorTag[] {
        return this.db.GetTags();
    }

    public AddTag(name: string): string {
        return this.db.InsertTag(name);
    }

    public DelTag(id: string): void {
        return this.db.DeleteTag(id);
    }
}