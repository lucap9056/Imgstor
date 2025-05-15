import { Database } from "sql.js";

export interface ImgstorTag {
    tagId: string
    name: string
}

const COLUMNS: { [K in keyof ImgstorTag]: K } = {
    tagId: "tagId",
    name: "name"
};

export class ImgstorTag {
    private static readonly empty: ImgstorTag = {
        tagId: "",
        name: ""
    }

    public static get Empty(): ImgstorTag {
        return Object.assign({}, ImgstorTag.empty);
    }
}

const TABLE_NAME = "Tag";

const CREATE_CMD = `
CREATE TABLE ${TABLE_NAME} (
    ${COLUMNS.tagId} INTEGER PRIMARY KEY AUTOINCREMENT,
    ${COLUMNS.name} TEXT NOT NULL
);
`;

function Get(db: Database, ...include: (keyof ImgstorTag)[]): ImgstorTag[] {

    const columns = include.length > 0 ? include.join(",") : "*";
    const query = `SELECT ${columns} FROM ${TABLE_NAME}`;

    const tags: ImgstorTag[] = [];

    const result = db.exec(query);

    if (result.length === 0) return tags;

    const columnNames = result[0].columns;

    for (const row of result[0].values) {
        const tag = ImgstorTag.Empty;

        columnNames.forEach((colName, index) => {
            tag[colName as keyof ImgstorTag] = (row[index] || "").toString();
        });

        tags.push(tag);
    }

    return tags;
}

function Insert(db: Database, name: string): void {
    const stmt = db.prepare(`INSERT INTO ${TABLE_NAME} (${COLUMNS.name}) VALUES (?)`)
    stmt.run([name]);
    stmt.free();
}

function Update(db: Database, tag: ImgstorTag): void {
    const { tagId, name } = tag;
    const stmt = db.prepare(`UPDATE ${TABLE_NAME} SET ${COLUMNS.name}=? WHERE ${COLUMNS.tagId}=?`);

    stmt.run([name, tagId]);
    stmt.free();
}

function Delete(db: Database, id: string): void {
    const stmt = db.prepare(`DELETE FROM ${TABLE_NAME} WHERE ${COLUMNS.tagId}=?`)
    stmt.run([id]);
    stmt.free();
}

export default {
    Get,
    Insert,
    Update,
    Delete,
    TABLE_NAME,
    CREATE_CMD,
    COLUMNS
}