import { Database } from "sql.js";
import Image from "services/imgstor-db/image";
import Tag, { ImgstorTag } from "services/imgstor-db/tag";

const TABLE_NAME = "ImageTag";
const CREATE_CMD = `
CREATE TABLE ${TABLE_NAME} (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    image INTEGER NOT NULL,
    tag INTEGER NOT NULL,
    FOREIGN KEY (image) REFERENCES ${Image.TABLE_NAME}(id) ON DELETE CASCADE,
    FOREIGN KEY (tag) REFERENCES ${Tag.TABLE_NAME}(id) ON DELETE CASCADE
);
`;

function Get(db: Database, image_id: string, ...include: (keyof ImgstorTag)[]): ImgstorTag[] {

    const columns = include.length > 0 ? include.map((i) => "t." + i).join(",") : "t.*";

    let query = `SELECT ${columns} FROM ${TABLE_NAME} it JOIN ${Tag.TABLE_NAME} t ON it.tag = t.id WHERE image =? `;

    const tags: ImgstorTag[] = [];

    const result = db.exec(query, [image_id]);

    if (result.length === 0) return tags;

    const columnNames = result[0].columns;

    for (const row of result[0].values) {
        const tag: ImgstorTag = ImgstorTag.Empty;

        columnNames.forEach((colName, index) => {
            tag[colName as keyof ImgstorTag] = (row[index] || "").toString();
        });

        tags.push(tag);
    }

    return tags;
}
function Insert(db: Database, image: string, tag: string): void {

    const stmt = db.prepare(`INSERT INTO ${TABLE_NAME} (image,tag) VALUES (?,?)`);
    stmt.run([image, tag]);
    stmt.free();
}

/**
 * - ImgstorDB.DelImageTag( image_id , tag_id )
 * - ImgstorDB.DelImageTag( image_tag_id )
 */
function Delete(db: Database, imageID_or_imageTagID: string, tagID?: string): void {

    if (tagID === undefined) {
        const stmt = db.prepare(`DELETE FROM ${TABLE_NAME} WHERE id=?`);
        stmt.run([imageID_or_imageTagID]);
        stmt.free();
    } else {
        const stmt = db.prepare(`DELETE FROM ${TABLE_NAME} WHERE image=? AND tag=?`);
        stmt.run([imageID_or_imageTagID, tagID]);
        stmt.free();
    }
}

export default {
    Get,
    Insert,
    Delete,
    TABLE_NAME,
    CREATE_CMD
}