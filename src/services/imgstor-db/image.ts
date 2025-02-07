import { Database } from "sql.js";
import HostingService from "services/imgstor-db/hosting-service";

export interface ImgstorImage {
    id: string
    name: string
    type: string

    width: string
    height: string

    hosting_service: string //ImgstorHostingService id
    link: string
    del: string
    preview: string

    title: string
    description: string

    create_time: string
    file_id: string
}

export type ImgstorImageSort = "default" | "newest" | "oldest";

export class ImgstorImage {
    private static readonly empty: ImgstorImage = {
        id: "",
        name: "",
        type: "",
        width: "0",
        height: "0",
        hosting_service: "",
        link: "",
        del: "",
        preview: "",
        title: "",
        description: "",
        create_time: "",
        file_id: ""
    }

    public static get Empty(): ImgstorImage {
        return Object.assign({}, ImgstorImage.empty);
    }

    public static readonly SORT = class {
        public static readonly DEFAULT: ImgstorImageSort = "default";
        public static readonly NEWEST: ImgstorImageSort = "newest";
        public static readonly OLDEST: ImgstorImageSort = "oldest";
    }
}


const TABLE_NAME = "Image";
const CERATE_CMD = `
CREATE TABLE Image (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    width TEXT NOT NULL,
    height TEXT NOT NULL,
    hosting_service INTEGER NOT NULL,
    link TEXT NOT NULL,
    del TEXT NOT NULL,
    preview TEXT NOT NULL,
    title TEXT,
    description TEXT,
    create_time INTEGER NOT NULL,
    file_id TEXT NOT NULL,
    FOREIGN KEY (hosting_service) REFERENCES ${HostingService.TABLE_NAME}(id)
);
`;

function Get(db: Database, ...include: (keyof ImgstorImage)[]): ImgstorImage[] {
    const columns = include.length > 0 ? include.join(",") : "*";
    const query = `SELECT ${columns} FROM ${TABLE_NAME}`;

    const images: ImgstorImage[] = [];

    const result = db.exec(query);

    if (result.length === 0) return images;

    const columnNames = result[0].columns;

    for (const row of result[0].values) {
        const image = ImgstorImage.Empty;

        columnNames.forEach((colName, index) => {
            image[colName as keyof ImgstorImage] = (row[index] || "").toString();
        });

        images.push(image);
    }

    return images;
}

function Insert(db: Database, image: ImgstorImage): void {
    const { name, type, width, height, hosting_service, link, del, preview, title, description, create_time, file_id } = image;

    const columns = "name, type, width, height, hosting_service, link, del, preview, title, description, create_time, file_id";
    const stmt = db.prepare(`INSERT INTO ${TABLE_NAME}(${columns}) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`)
    stmt.run([name, type, width, height, hosting_service, link, del, preview, title, description, create_time, file_id]);
    stmt.free();
}

function Update(db: Database, image: ImgstorImage): void {
    const { name, type, width, height, hosting_service, link, del, preview, title, description, create_time, file_id, id } = image;
    
    const columnsToUpdate = "name = ?, type = ?, width = ?, height = ?, hosting_service = ?, link = ?, del = ?, preview = ?, title = ?, description = ?, create_time = ?, file_id = ?";
    const stmt = db.prepare(`UPDATE ${TABLE_NAME} SET ${columnsToUpdate} WHERE id = ?`);
    
    stmt.run([name, type, width, height, hosting_service, link, del, preview, title, description, create_time, file_id, id]);
    stmt.free();
}

function Delete(db: Database, id: string): void {
    const stmt = db.prepare(`DELETE FROM ${TABLE_NAME} WHERE id=?`);
    stmt.run([id]);
    stmt.free();
}

export default {
    Get,
    Insert,
    Update,
    Delete,
    TABLE_NAME,
    CERATE_CMD,
}