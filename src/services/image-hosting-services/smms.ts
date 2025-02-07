import { FormatNames } from "services/converter/file-formats";
import { Features, ImageFile } from "services/image-hosting-services";
import ImgstorDB, { ImgstorImage } from "services/imgstor-db";

interface SmmsUploadResult {
    success: boolean,
    code: string,
    message: string,
    data: {
        file_id: number,
        width: number,
        height: number,
        filename: string,
        storename: string,
        size: number,
        path: string,
        hash: string,
        url: string,
        delete: string,
        page: string
    },
    RequestId: string
}

interface SmmsDeletionResult {
    success: boolean
    code: string
    message: string
    RequestId: string
}


export default class Smms {
    public static readonly NAME = "SM.MS";
    public readonly NAME = Smms.NAME;

    public readonly SupportedStaticFormats: FormatNames[] = ["WebP", "PNG", "JPEG", "TIFF", "AVIF", "BMP"];//svg heif heic
    public readonly SupportedDynamicFormats: FormatNames[] = ["GIF", "WEBM", "APNG", "MP4", "MPEG", "MOV", "MKV", "FLV", "AVI", "WMV", "OGG"];

    public readonly id: string;
    public readonly enabled: boolean;
    private readonly proxy: string;
    private readonly token: string;
    public readonly features: Features = {
        Save: true,
        File: true,
        Tags: true,
        Description: true
    };
    constructor(id: string, ebabled: boolean, proxy: string, token: string) {
        this.id = id;
        this.enabled = ebabled;
        this.proxy = proxy;
        this.token = token;
    }

    public async Upload(_: boolean, imageFile: ImageFile): Promise<ImgstorImage> {
        const { id, proxy, token } = this;

        const file = (imageFile.Processed || imageFile.Original).file;

        if (file.size > 5 * Math.pow(1024, 2)) {
            throw new Error("the file size is too large");
        }

        const form = new FormData();
        form.append("smfile", file);

        const res = await fetch(`${proxy}/api/v2/upload`, {
            method: "POST",
            headers: {
                "Authorization": token
            },
            body: form
        });

        if (!res.ok) {
            throw new Error(`HTTP fail! status: ${res.status}`);
        }

        const result: SmmsUploadResult = await res.json();

        const image: ImgstorImage = {
            id: "",
            name: imageFile.Original.file.name,
            type: imageFile.Original.file.type,
            width: result.data.width.toString(),
            height: result.data.height.toString(),
            link: result.data.url,
            preview: result.data.url,
            title: ImgstorDB.EncodeText(imageFile.Title),
            description: ImgstorDB.EncodeText(imageFile.Description),
            del: result.data.hash,
            create_time: new Date().getTime().toString(),
            file_id: "",
            hosting_service: id
        }

        return image;
    }

    public async Delete(image: ImgstorImage): Promise<void> {
        const { proxy, token } = this;

        const res = await fetch(`${proxy}/api/v2/delete/${image.del}`, {
            headers: {
                "Authorization": token
            },
        });

        if (!res.ok) {
            throw new Error(`HTTP fail! status: ${res.status}`);
        }

        const result: SmmsDeletionResult = await res.json();

        if (!result.success) {
            throw new Error(result.message);
        }

    }

    public async Preview(image: ImgstorImage): Promise<string> {
        return image.preview;
    }
}

