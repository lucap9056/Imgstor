import EventDispatcher from "structs/event-dispatcher";
import initSqlJs, { Database } from "sql.js";
import { Drive } from 'services/google';

import Tag, { ImgstorTag } from "services/imgstor-db/tag";
import Image, { ImgstorImage, ImgstorImageSort } from "services/imgstor-db/image";
import HostingService, { ImgstorHostingService } from "services/imgstor-db/hosting-service";
import ImageTag from "services/imgstor-db/image-tag";
import Advanced, { SearchImagesArgs } from "services/imgstor-db/advanced";
import Info from "services/imgstor-db/info";

export {
    ImgstorHostingService,
    ImgstorTag,
    ImgstorImage
};

export type {
    ImgstorImageSort,
    SearchImagesArgs
};

const enum DataFile {
    name = ".db",
    type = "text/plain"
}

interface ImgstorData {
    fileId: string
    data?: string
}

type ImgstorDBEventDefinitions = {
    "ImageUpdated": { detail: ImgstorImage }
    "ErrorOccurred": { detail: { message: string, error: Error } }
};
export type ImgstorDBEvent<T extends keyof ImgstorDBEventDefinitions> = ImgstorDBEventDefinitions[T];


const enum SqlJs {
    Host = "https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.13.0/"
}

async function LoadDatabase(data: string): Promise<Database> {
    const sql = await initSqlJs({
        locateFile: file => SqlJs.Host + file
    });
    const dataBytes = ImgstorDB.Base64ToUint8Array(data);
    const db = new sql.Database(dataBytes);

    try {
        Info.ensureVersion(db);
    }
    catch {
        return NewDatabase();
    }

    return db;
}

async function NewDatabase(): Promise<Database> {
    const sql = await initSqlJs({
        locateFile: file => SqlJs.Host + file
    });
    const db = new sql.Database();

    db.run(`
${Info.CREATE_CMD}
${HostingService.CREATE_CMD}
${Tag.CREATE_CMD}
${Image.CERATE_CMD}
${ImageTag.CREATE_CMD}
`);

    const stmt = db.prepare(Info.INSERT_CMD);
    stmt.run([Info.VERSION]);
    stmt.free();
    return db;
}

export default class ImgstorDB extends EventDispatcher<ImgstorDBEventDefinitions> {

    public static Base64ToUint8Array = function (base64: string): Uint8Array {
        return Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    }

    public static New = async function (drive: Drive): Promise<ImgstorDB> {

        const dataFile = await ImgstorDB.ReadData(drive);

        const db = (dataFile.data) ? await LoadDatabase(dataFile.data) : await NewDatabase();

        return new ImgstorDB(db, drive, dataFile);
    }

    private static ReadData(drive: Drive): Promise<ImgstorData> {
        return new Promise((resolve, reject) => {
            drive.searchFiles([], DataFile.name).then(async (res) => {

                if (!res.files || res.files.length === 0) {
                    const res = await drive.createFile(DataFile.name, DataFile.type);

                    if (!res.id) {
                        return reject(new Error());
                    }

                    return resolve({ fileId: res.id });
                }

                const fileId = res.files[0].id;

                if (!fileId) {
                    return reject(new Error());
                }

                drive.readFile(fileId).then((data) => {
                    resolve({ fileId, data })
                }).catch(reject);


            }).catch(reject);

        });
    }

    public static EncodeText(str: string) {
        const encodedStr = encodeURI(str);

        return encodedStr
            .replace(/%20/g, '_SPACE_')
            .replace(/%2B/g, '_PLUS_')
            .replace(/%2F/g, '_SLASH_')
            .replace(/%3F/g, '_QUESTION_')
            .replace(/%3D/g, '_EQUALS_')
            .replace(/%23/g, '_HASH_')
            .replace(/%25/g, '_PERCENT_')
            .replace(/%40/g, '_AT_')
            .replace(/%3A/g, '_COLON_')
            .replace(/%2C/g, '_COMMA_')
            .replace(/%22/g, '_QUOTE_')
            .replace(/%27/g, '_APOSTROPHE_');
    }

    public static DecodeText(encodedStr: string) {

        const decodedStr = encodedStr
            .replace(/_SPACE_/g, ' ')
            .replace(/_PLUS_/g, '+')
            .replace(/_SLASH_/g, '/')
            .replace(/_QUESTION_/g, '?')
            .replace(/_EQUALS_/g, '=')
            .replace(/_HASH_/g, '#')
            .replace(/_PERCENT_/g, '%')
            .replace(/_AT_/g, '@')
            .replace(/_COLON_/g, ':')
            .replace(/_COMMA_/g, ',')
            .replace(/_QUOTE_/g, '"')
            .replace(/_APOSTROPHE_/g, "'");

        return decodeURI(decodedStr);
    }

    private db: Database;
    private drive: Drive;
    private dataFile: ImgstorData;
    private changed: boolean = false;
    constructor(db: Database, drive: Drive, dataFile: ImgstorData) {
        super();
        this.db = db;
        this.drive = drive;
        this.dataFile = dataFile;
    }

    public GetHostingServices(...include: (keyof ImgstorHostingService)[]): ImgstorHostingService[] {
        return HostingService.Get(this.db, ...include);
    }

    public InsertHostingService(name: string): string {
        HostingService.Insert(this.db, name);
        this.changed = true;
        return this.lastInsertRowid;
    }

    public DeleteHostingService(id: string): void {
        HostingService.Delete(this.db, id);
        this.changed = true;
    }

    public GetTags(...include: (keyof ImgstorTag)[]): ImgstorTag[] {
        return Tag.Get(this.db, ...include);
    }

    public InsertTag(name: string): string {
        Tag.Insert(this.db, name);
        this.changed = true;
        return this.lastInsertRowid;
    }

    public DeleteTag(id: string): void {
        Tag.Delete(this.db, id);
        this.changed = true;
    }

    public GetImages(...include: (keyof ImgstorImage)[]) {
        return Image.Get(this.db, ...include);
    }

    public InsertImage(image: ImgstorImage): string {
        Image.Insert(this.db, image);
        this.changed = true;
        this.emit("ImageUpdated", { detail: image });
        return this.lastInsertRowid;
    }

    public UpdateImage(image: ImgstorImage): void {
        Image.Update(this.db, image);
        this.emit("ImageUpdated", { detail: image });
        this.changed = true;
    }

    public DeleteImage(imageId: string): void {
        Image.Delete(this.db, imageId);
        this.emit("ImageUpdated", { detail: { ...ImgstorImage.Empty, imageId } });
        this.changed = true;
    }

    public GetImageTags(image_id: string, ...include: (keyof ImgstorTag)[]): ImgstorTag[] {
        return ImageTag.Get(this.db, image_id, ...include);
    }

    public InsertImageTag(image_id: string, tag_id: string): string {
        ImageTag.Insert(this.db, image_id, tag_id);
        this.changed = true;
        return this.lastInsertRowid;
    }

    /**
     * - ImgstorDB.DelImageTag( image_id , tag_id )
     * - ImgstorDB.DelImageTag( image_tag_id )
     */
    public DeleteImageTag(imageID_or_imageTagID: string, tagID?: string): void {
        ImageTag.Delete(this.db, imageID_or_imageTagID, tagID);
        this.changed = true;
    }

    public SearchImages(args: SearchImagesArgs = {}): ImgstorImage[] {
        return Advanced.SearchImages(this.db, args);
    }


    public get Changed(): boolean {
        return this.changed;
    }

    public Save(): Promise<ImgstorData> {
        const { drive, db, dataFile } = this;

        const dataBytes = db.export();
        const data = btoa(String.fromCharCode(...dataBytes));

        this.changed = false;

        return new Promise(async (resolve, reject) => {

            if (dataFile.fileId === "") {
                const res = await drive.createFile(DataFile.name, DataFile.type);

                if (!res.id) {
                    return reject(new Error());
                }

                dataFile.fileId = res.id;
            }

            const dataBlob = new Blob([data], { type: DataFile.type });
            const file = new File([dataBlob], DataFile.name, { type: DataFile.type });

            await drive.writeFile(dataFile.fileId, file);

            resolve(dataFile);
        });

    }

    private get lastInsertRowid(): string {
        const result = this.db.exec("SELECT last_insert_rowid()");
        return (result[0].values[0][0] || "").toString();
    }
}