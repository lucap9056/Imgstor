import { createContext, useContext } from 'react';
import Google, { Drive } from 'services/google';
import EventDispatcher from 'structs/event-dispatcher';
import ImgstorDB, { ImgstorTag, ImgstorImage, ImgstorImageSort } from 'services/imgstor-db';
import Settings, { ImgstorConfig } from 'services/settings';
import TagsSelector from 'services/tags-selector';
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
        tagId: "",
        name: ""
    }

    public static get CreateId(): string {
        const time = new Date().getTime().toString(36);
        const random = (Math.floor(Math.random() * 100)).toString(36);
        return time + random;
    }

    public static New = async function (google: Google): Promise<Imgstor> {

        const [images, settings, db] = await Promise.all([
            Imgstor.ImagesFolder(google.drive),
            Settings.new(google.drive),
            ImgstorDB.New(google.drive)
        ]);

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

            drive.searchFiles([], Imgstor.OriginalFilesFolderName).then((res) => {
                const { files } = res;

                if (!files) {
                    return reject(new Error());
                }

                for (const file of files) {
                    if (file.mimeType === "application/vnd.google-apps.folder") {
                        return resolve(file);
                    }
                }

                drive.createFolder(Imgstor.OriginalFilesFolderName).then(resolve).catch(reject);

            }).catch(reject);

        });
    }

    private google: Google;
    public readonly settings: Settings;
    public readonly db: ImgstorDB;
    public readonly tagsSelector: TagsSelector;
    public readonly converter: Converter = new Converter();
    private filesFolder: gapi.client.drive.File;
    private imageHostingServices: AvailableHostingServicesMap = {};
    constructor(google: Google, settings: Settings, filesFolder: gapi.client.drive.File, db: ImgstorDB) {
        super();
        this.google = google;
        this.settings = settings;
        this.filesFolder = filesFolder;
        this.db = db;
        this.tagsSelector = new TagsSelector(db);

        settings.on("ConfigChanged", ({ detail }) => this.loadImageHostingServices(detail.config));

        this.loadImageHostingServices(settings.config);
    }

    private loadImageHostingServices(config: ImgstorConfig): void {
        const { db } = this;

        const { local, importExternal, imgur, catbox, smms } = config.hostingServices;

        this.imageHostingServices = db.GetHostingServices("id", "name").map((lib) => {
            const { id, name } = lib;
            switch (name) {
                case Local.NAME: {
                    const { isEnabled } = local;
                    return new Local(id, isEnabled);
                }
                case ImportExternal.NAME: {
                    const { isEnabled } = importExternal;
                    return new ImportExternal(id, isEnabled);
                }
                case Imgur.NAME: {
                    const { isEnabled, clientId } = imgur;
                    return new Imgur(id, isEnabled, clientId);
                }
                case Catbox.NAME: {
                    const { isEnabled, proxy, userhash, separatePreviewUpload } = catbox;
                    return new Catbox(id, isEnabled, proxy, userhash, separatePreviewUpload);
                }
                case Smms.NAME: {
                    const { isEnabled, proxy, token, separatePreviewUpload } = smms;
                    return new Smms(id, isEnabled, proxy, token, separatePreviewUpload);
                }
            }
        }).filter((l) => l !== undefined).reduce((acc: AvailableHostingServicesMap, l) => {
            acc[l.hostingServiceId] = l;
            return acc;
        }, {});
    }

    public appendImage(image: ImgstorImage, file: File): Promise<ImgstorImage> {
        image.imageId = Imgstor.CreateId;

        const { google, filesFolder } = this;

        return new Promise(async (resolve, reject) => {


            google.drive.createFile(image.imageId, file.type, filesFolder.id).then(async (res) => {
                const fileId = res.id;

                if (!fileId) {
                    return reject(new Error());
                }


                await google.drive.writeFile(fileId, file);

                image.fileId = fileId;

                this.emit("ImageAppended", { detail: image });

                resolve(image);
            }).catch(reject);
        });
    }

    public removeImage(image: ImgstorImage): Promise<void> {
        return this.google.drive.deleteFile(image.fileId);
    }

    public async DownloadImage(image: ImgstorImage): Promise<File> {
        const res = await this.google.drive.readFile(image.fileId);
        const bytes = Uint8Array.from(res, char => char.charCodeAt(0));
        const blob = new Blob([bytes], { type: image.mimeType });
        return new File([blob], image.name);
    }

    public setImageSearch(content: SearchContent): void {
        this.emit("ImageSearchChanged", { detail: content });
    }

    public get using(): Promise<number> {
        return this.google.drive.using();
    }

    public async clear(): Promise<void> {
        return await this.google.drive.clear();
    }

    public get availableHostingServices(): AvailableHostingServicesMap {
        return this.imageHostingServices;
    }

    public get enabledHostingServices(): ImageHostingService[] {
        const { imageHostingServices } = this;

        return Object.values(imageHostingServices).filter((l) => l.isEnabled);
    }

    public logout(): void {
        return this.google.signOut();
    }
}


const ImgstorContext = createContext<Imgstor | null>(null);

const ImgstorProvider: React.FC<{ value: Imgstor, children: React.ReactNode }> = ({ value, children }) => {
    return <ImgstorContext.Provider value={value}>{children}</ImgstorContext.Provider>
};

const useImgstor = (): Imgstor => {
    const context = useContext(ImgstorContext);
    if (!context) {
        throw new Error("useImgstor must be used within an ImgstorProvider.");
    }
    return context;
};

export {
    ImgstorProvider,
    useImgstor
};