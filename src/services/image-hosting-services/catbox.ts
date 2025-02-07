import { FormatNames } from "services/converter/file-formats";
import { Features, ImageFile } from "services/image-hosting-services";
import ImgstorDB, { ImgstorImage } from "services/imgstor-db";


export default class Catbox {
    public static readonly NAME = "Catbox";
    public readonly NAME = Catbox.NAME;

    public readonly SupportedStaticFormats: FormatNames[] = ["WebP", "PNG", "JPEG", "TIFF", "AVIF", "BMP"];//svg heif heic
    public readonly SupportedDynamicFormats: FormatNames[] = ["WebP", "GIF", "WEBM", "APNG", "MP4", "MPEG", "MOV", "MKV", "FLV", "AVI", "WMV", "OGG"];

    public readonly id: string;
    public readonly enabled: boolean;
    public readonly proxy: string;
    private readonly userhash: string;
    public readonly features: Features = {
        Save: true,
        File: true,
        Tags: true,
        Description: true
    };

    constructor(id: string, ebabled: boolean, proxy: string, userhash: string) {
        this.id = id;
        this.enabled = ebabled;
        this.proxy = proxy;
        this.userhash = userhash;
    }

    public async Upload(save: boolean, imageFile: ImageFile): Promise<ImgstorImage> {
        const { id, proxy, userhash } = this;

        const file = (imageFile.Processed || imageFile.Original).file;

        if (file.size > 200 * Math.pow(1024, 2)) {
            throw new Error("the file size is too large");
        }

        const form = new FormData();

        if (save) {
            form.append("userhash", userhash);
        }
        form.append("reqtype", "fileupload");
        form.append("fileToUpload", file);

        const res = await fetch(proxy, {
            method: "POST",
            body: form
        });

        if (!res.ok) {
            throw new Error(`HTTP fail! status: ${res.status}`);
        }

        const result = await res.text();

        const image: ImgstorImage = {
            id: "",
            name: imageFile.Original.file.name,
            type: imageFile.Original.file.type,
            width: imageFile.Width.toString(),
            height: imageFile.Height.toString(),
            link: result,
            preview: result,
            title: ImgstorDB.EncodeText(imageFile.Title),
            description: ImgstorDB.EncodeText(imageFile.Description),
            del: userhash,
            create_time: new Date().getTime().toString(),
            file_id: "",
            hosting_service: id
        }

        return image;
    }

    public async Delete(image: ImgstorImage): Promise<void> {
        const { proxy } = this;
        const { link, del } = image;

        if (del === "") {
            return;
        }

        const file = link.replace(/.*\//g, '');

        const form = new FormData();
        form.append("reqtype", "deletefiles");
        form.append("userhash", del);
        form.append("files", file);

        await fetch(proxy, {
            method: "POST",
            body: form
        });
    }

    public async Preview(image: ImgstorImage): Promise<string> {
        return image.preview;
    }
}