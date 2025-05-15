import { Database } from "sql.js";
import HostingService from "services/imgstor-db/hosting-service";

export interface ImgstorImage {
    imageId: string
    name: string
    mimeType: string

    width: string
    height: string

    hostingServiceId: string
    imageUrl: string
    deleteImageUrl: string
    previewUrl: string
    deletePreviewUrl: string

    title: string
    description: string

    createTime: string
    fileId: string
}

const COLUMNS: { [K in keyof ImgstorImage]: K } = {
    imageId: "imageId",
    name: "name",
    mimeType: "mimeType",
    width: "width",
    height: "height",
    hostingServiceId: "hostingServiceId",
    imageUrl: "imageUrl",
    deleteImageUrl: "deleteImageUrl",
    previewUrl: "previewUrl",
    deletePreviewUrl: "deletePreviewUrl",
    title: "title",
    description: "description",
    createTime: "createTime",
    fileId: "fileId",
};

export type ImgstorImageSort = "default" | "newest" | "oldest";

export class ImgstorImage {
    private static readonly empty: ImgstorImage = {
        imageId: "",
        name: "",
        mimeType: "",
        width: "0",
        height: "0",
        hostingServiceId: "",
        imageUrl: "",
        deleteImageUrl: "",
        previewUrl: "",
        deletePreviewUrl: "",

        title: "",
        description: "",

        createTime: "",
        fileId: "",
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
CREATE TABLE ${TABLE_NAME} (
    ${COLUMNS.imageId} INTEGER PRIMARY KEY AUTOINCREMENT,
    ${COLUMNS.name} TEXT NOT NULL,
    ${COLUMNS.mimeType} TEXT NOT NULL,
    ${COLUMNS.width} TEXT NOT NULL,
    ${COLUMNS.height} TEXT NOT NULL,
    ${COLUMNS.hostingServiceId} INTEGER NOT NULL,
    ${COLUMNS.imageUrl} TEXT NOT NULL,
    ${COLUMNS.deleteImageUrl} TEXT NOT NULL,
    ${COLUMNS.previewUrl} TEXT NOT NULL,
    ${COLUMNS.deletePreviewUrl} TEXT NOT NULL,
    ${COLUMNS.title} TEXT,
    ${COLUMNS.description} TEXT,
    ${COLUMNS.createTime} INTEGER NOT NULL,
    ${COLUMNS.fileId} TEXT NOT NULL,
    FOREIGN KEY (${COLUMNS.hostingServiceId}) REFERENCES ${HostingService.TABLE_NAME}(${HostingService.COLUMNS.id})
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
    const {
        name,
        mimeType,
        width,
        height,
        hostingServiceId,
        imageUrl,
        deleteImageUrl,
        previewUrl,
        deletePreviewUrl,
        title,
        description,
        createTime,
        fileId
    } = image;

    const columns: (keyof ImgstorImage)[] = [
        COLUMNS.name,
        COLUMNS.mimeType,
        COLUMNS.width,
        COLUMNS.height,
        COLUMNS.hostingServiceId,
        COLUMNS.imageUrl,
        COLUMNS.deleteImageUrl,
        COLUMNS.previewUrl,
        COLUMNS.deletePreviewUrl,
        COLUMNS.title,
        COLUMNS.description,
        COLUMNS.createTime,
        COLUMNS.fileId
    ];

    const columnsToInsert = columns.join(",");
    const stmt = db.prepare(`INSERT INTO ${TABLE_NAME}(${columnsToInsert}) VALUES(${columns.map(_ => '?').join(",")})`)
    stmt.run([name, mimeType, width, height, hostingServiceId, imageUrl, deleteImageUrl, previewUrl, deletePreviewUrl, title, description, createTime, fileId]);
    stmt.free();
}

function Update(db: Database, image: ImgstorImage): void {
    const {
        imageId,
        name,
        mimeType,
        width,
        height,
        hostingServiceId,
        imageUrl,
        deleteImageUrl,
        previewUrl,
        deletePreviewUrl,
        title,
        description,
        createTime,
        fileId
    } = image;

    const columns: (keyof ImgstorImage)[] = [
        COLUMNS.name,
        COLUMNS.mimeType,
        COLUMNS.width,
        COLUMNS.height,
        COLUMNS.hostingServiceId,
        COLUMNS.imageUrl,
        COLUMNS.deleteImageUrl,
        COLUMNS.previewUrl,
        COLUMNS.deletePreviewUrl,
        COLUMNS.title,
        COLUMNS.description,
        COLUMNS.createTime,
        COLUMNS.fileId
    ];

    const columnsToUpdate = columns.map(c => c + "=?").join(',');
    const stmt = db.prepare(`UPDATE ${TABLE_NAME} SET ${columnsToUpdate} WHERE ${COLUMNS.imageId}=?`);

    stmt.run([name, mimeType, width, height, hostingServiceId, imageUrl, deleteImageUrl, previewUrl, deletePreviewUrl, title, description, createTime, fileId, imageId]);
    stmt.free();
}

function Delete(db: Database, id: string): void {
    const stmt = db.prepare(`DELETE FROM ${TABLE_NAME} WHERE ${COLUMNS.imageId}=?`);
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
    COLUMNS
}