import { Database } from "sql.js";
import Image from "services/imgstor-db/image";
import Tag, { ImgstorTag } from "services/imgstor-db/tag";

interface ImgstorImageTag {
    id: number
    image: number
    tag: number
}

const COLUMNS: { [K in keyof ImgstorImageTag]: K } = {
    id: "id",
    image: "image",
    tag: "tag"
}

const TABLE_NAME = "ImageTag";
const CREATE_CMD = `
CREATE TABLE ${TABLE_NAME} (
    ${COLUMNS.id} INTEGER PRIMARY KEY AUTOINCREMENT,
    ${COLUMNS.image} INTEGER NOT NULL,
    ${COLUMNS.tag} INTEGER NOT NULL,
    FOREIGN KEY (${COLUMNS.image}) REFERENCES ${Image.TABLE_NAME}(${Image.COLUMNS.imageId}) ON DELETE CASCADE,
    FOREIGN KEY (${COLUMNS.tag}) REFERENCES ${Tag.TABLE_NAME}(${Tag.COLUMNS.tagId}) ON DELETE CASCADE
);
`;

function Get(db: Database, image_id: string, ...include: (keyof ImgstorTag)[]): ImgstorTag[] {

    const columns = include.length > 0 ? include.map((i) => "t." + i).join(",") : "t.*";

    let query = `SELECT ${columns} FROM ${TABLE_NAME} it JOIN ${Tag.TABLE_NAME} t ON it.${COLUMNS.tag} = t.${Tag.COLUMNS.tagId} WHERE ${COLUMNS.image}=?`;

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

    const stmt = db.prepare(`INSERT INTO ${TABLE_NAME} (${COLUMNS.image},${COLUMNS.tag}) VALUES (?,?)`);
    stmt.run([image, tag]);
    stmt.free();
}

/**
 * - ImgstorDB.DelImageTag( image_id , tag_id )
 * - ImgstorDB.DelImageTag( image_tag_id )
 */
function Delete(db: Database, imageID_or_imageTagID: string, tagID?: string): void {

    if (tagID === undefined) {
        const stmt = db.prepare(`DELETE FROM ${TABLE_NAME} WHERE ${COLUMNS.id}=?`);
        stmt.run([imageID_or_imageTagID]);
        stmt.free();
    } else {
        const stmt = db.prepare(`DELETE FROM ${TABLE_NAME} WHERE ${COLUMNS.image}=? AND ${COLUMNS.tag}=?`);
        stmt.run([imageID_or_imageTagID, tagID]);
        stmt.free();
    }
}

export default {
    Get,
    Insert,
    Delete,
    TABLE_NAME,
    CREATE_CMD,
    COLUMNS
}