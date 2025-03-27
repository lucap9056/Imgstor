/**
 * 手動事件傳遞
 */
import Google, { Drive } from 'services/google';
import EventDispatcher from 'structs/event-dispatcher';
import ImgstorDB, { ImgstorTag, ImgstorImage, ImgstorImageSort } from 'services/imgstor-db';
import Settings, { ImgstorConfig } from 'services/settings';
import TagsSelecter from 'services/tags-selecter';
import Local from 'services/image-hosting-services/local';
import Imgur from 'services/image-hosting-services/imgur';
import { ImageHostingService } from 'services/image-hosting-services';
import Catbox from 'services/image-hosting-services/catbox';
import Smms from 'services/image-hosting-services/smms';
import ImportExternal from 'services/image-hosting-services/import-external';
import Converter from "services/converter";

export interface SearchContent {
    title: string
    tags: ImgstorTag[]
    sort: ImgstorImageSort
}

export type AvailableHostingServicesMap = { [id: string]: ImageHostingService }

type ImgstorEventDefinitions = {
    "ImageAppended": { detail: ImgstorImage }
    "ImageSearchChanged": { detail: SearchContent }
};
export type ImgstorEvent<T extends keyof ImgstorEventDefinitions> = ImgstorEventDefinitions[T];

export default class Imgstor extends EventDispatcher<ImgstorEventDefinitions> {

    public static readonly OriginalFilesFolderName = "original_files"

    public static readonly NotStoredTag: ImgstorTag = {
        id: "",
        name: ""
    }

    public static get CreateId(): string {
        const time = new Date().getTime().toString(36);
        const random = (Math.floor(Math.random() * 100)).toString(36);
        return time + random;
    }

    public static New = async function (google: Google): Promise<Imgstor> {

        const awaitImagesFolder = Imgstor.ImagesFolder(google.Drive);

        const awaitSettings = Settings.New(google.Drive);

        const [images, settings] = await Promise.all([awaitImagesFolder, awaitSettings]);

        const db = await ImgstorDB.New(google.Drive);

        Imgstor.PresetHostingServices(db);

        return new Imgstor(google, settings, images, db);

    }

    private static PresetHostingServices(db: ImgstorDB): void {
        const existedHostingServices = db.GetHostingServices("name").map(l => l.name);

        const hostingServices: string[] = [ImportExternal.NAME, Imgur.NAME, Catbox.NAME, Smms.NAME, Local.NAME];

        for (const hostingService of hostingServices) {
            if (!existedHostingServices.includes(hostingService)) {
                db.InsertHostingService(hostingService);
            }
        }

    }

    private static ImagesFolder(drive: Drive): Promise<gapi.client.drive.File> {
        return new Promise((resolve, reject) => {

            drive.SearchFiles([], Imgstor.OriginalFilesFolderName).then((res) => {
                const { files } = res;

                if (!files) {
                    return reject(new Error());
                }

                for (const file of files) {
                    if (file.mimeType === "application/vnd.google-apps.folder") {
                        return resolve(file);
                    }
                }

                drive.CreateFolder(Imgstor.OriginalFilesFolderName).then(resolve).catch(reject);

            }).catch(reject);

        });
    }

    private google: Google;
    private settings: Settings;
    private filesFolder: gapi.client.drive.File;
    private db: ImgstorDB;
    private tagsSelecter: TagsSelecter;
    private converter: Converter = new Converter();
    private imageHostingServices: AvailableHostingServicesMap = {};
    constructor(google: Google, settings: Settings, filesFolder: gapi.client.drive.File, db: ImgstorDB) {
        super();
        this.google = google;
        this.settings = settings;
        this.filesFolder = filesFolder;
        this.db = db;
        this.tagsSelecter = new TagsSelecter(db);

        settings.on("ConfigChanged", (e) => this.ImageHostingServices(e.detail));

        this.ImageHostingServices(settings.Config);
    }

    private ImageHostingServices(config: ImgstorConfig): void {
        const { db } = this;

        const { local, importExternal, imgur, catbox, smms } = config.hostingServices;

        this.imageHostingServices = db.GetHostingServices("id", "name").map((lib) => {
            const { id, name } = lib;
            switch (name) {
                case Local.NAME: {
                    const { enabled } = local;
                    return new Local(id, enabled);
                }
                case ImportExternal.NAME: {
                    const { enabled } = importExternal;
                    return new ImportExternal(id, enabled);
                }
                case Imgur.NAME: {
                    const { enabled, clientId } = imgur;
                    return new Imgur(id, enabled, clientId);
                }
                case Catbox.NAME: {
                    const { enabled, proxy, userhash } = catbox;
                    return new Catbox(id, enabled, proxy, userhash);
                }
                case Smms.NAME: {
                    const { enabled, proxy, token } = smms;
                    return new Smms(id, enabled, proxy, token);
                }
            }
        }).filter((l) => l !== undefined).reduce((acc: AvailableHostingServicesMap, l) => {
            acc[l.id] = l;
            return acc;
        }, {});
    }

    public AppendImage(image: ImgstorImage, file: File): Promise<ImgstorImage> {
        image.id = Imgstor.CreateId;

        const { google, filesFolder } = this;

        return new Promise(async (resolve, reject) => {


            google.Drive.CreateFile(image.id, file.type, filesFolder.id).then(async (res) => {
                const fileId = res.id;

                if (!fileId) {
                    return reject(new Error());
                }


                await google.Drive.WriteFile(fileId, file);

                image.file_id = fileId;

                this.emit("ImageAppended", { detail: image });

                resolve(image);
            }).catch(reject);
        });
    }

    public RemoveImage(image: ImgstorImage): Promise<void> {
        return this.google.Drive.DeleteFile(image.file_id);
    }

    public async DownloadImage(image: ImgstorImage): Promise<File> {
        const res = await this.google.Drive.ReadFile(image.file_id);
        const bytes = Uint8Array.from(res, char => char.charCodeAt(0));
        const blob = new Blob([bytes], { type: image.type });
        return new File([blob], image.name);
    }

    public SetImageSearch(content: SearchContent): void {
        this.emit("ImageSearchChanged", { detail: content });
    }

    public get AvailableHostingServices(): AvailableHostingServicesMap {
        return this.imageHostingServices;
    }

    public get EnabledHostingServices(): ImageHostingService[] {
        const { imageHostingServices } = this;

        return Object.values(imageHostingServices).filter((l) => l.enabled);
    }

    public get DB(): ImgstorDB {
        return this.db;
    }

    public get Settings(): Settings {
        return this.settings;
    }

    public get TagsSelecter(): TagsSelecter {
        return this.tagsSelecter;
    }

    public get FileConverter(): Converter {
        return this.converter;
    }

    public SignOut(): void {
        return this.google.SignOut();
    }
}