import { FormatNames } from "services/converter/file-formats";
import { ServiceFeatures, ImageFile } from "services/image-hosting-services";
import ImgstorDB, { ImgstorImage } from "services/imgstor-db";


export default class Imgur {
    public static readonly NAME = "Imgur";
    public readonly NAME = Imgur.NAME;
    public readonly SupportedStaticFormats: FormatNames[] = ["PNG", "JPEG", "TIFF", "GIF"];
    public readonly SupportedAnimationFormats: FormatNames[] = ["GIF", "MP4", "WEBM", "APNG", "MPEG", "MOV", "MKV", "FLV", "AVI", "WMV"];

    public readonly hostingServiceId: string;
    public readonly isEnabled: boolean;
    private readonly clientId: string;
    public readonly features: ServiceFeatures = {
        save: true,
        file: true,
        tags: true,
        description: true
    };
    constructor(id: string, isEnabled: boolean, clientId: string) {
        this.hostingServiceId = id;
        this.isEnabled = isEnabled;
        this.clientId = clientId;
    }

    public async Upload(_: boolean, imageFile: ImageFile): Promise<ImgstorImage> {

        const { hostingServiceId, clientId } = this;

        const file = (imageFile.processed || imageFile.original).file;

        if (file.size > 20 * Math.pow(1024, 2)) {
            throw new Error("the file size is too large");
        }

        const form = new FormData();

        form.append("title", imageFile.title);
        form.append("description", imageFile.description);
        form.append("image", file);

        const res = await fetch("https://api.imgur.com/3/image", {
            method: "POST",
            headers: {
                "Authorization": `Client-ID ${clientId}`
            },
            body: form,
        });

        const result = await res.json();

        if (IsImgurNotSuccessResult(result)) {
            throw new Error(result.data.error);
        }


        if (IsImgurSuccessResult(result)) {
            return {
                imageId: "",
                name: imageFile.original.file.name,
                mimeType: imageFile.original.file.type,
                width: result.data.width.toString(),
                height: result.data.height.toString(),
                imageUrl: result.data.link,
                previewUrl: `https://i.imgur.com/${result.data.id}m.jpg`,
                deleteImageUrl: result.data.deletehash,
                deletePreviewUrl: "",
                title: ImgstorDB.EncodeText(imageFile.title),
                description: ImgstorDB.EncodeText(imageFile.description),
                createTime: new Date().getTime().toString(),
                fileId: "",
                hostingServiceId: hostingServiceId,
            };
        }

        throw new Error("Unexpected response format from Imgur API.");
    }

    public Delete(image: ImgstorImage): Promise<void> {

        const { clientId } = this;

        return new Promise(async () => {
            await fetch(`https://api.imgur.com/3/image/${image.deleteImageUrl}`, {
                method: "DELETE",
                headers: {
                    "Authorization": `Client-ID ${clientId}`
                },
                redirect: 'follow'
            })
        });
    }

    public Preview(image: ImgstorImage): string {
        return image.previewUrl;
    }
}

function IsImgurSuccessResult(obj: any): obj is ImgurSuccessResult {
    if (typeof obj.data !== "object") {
        return false;
    }

    if (typeof obj.status !== "number") {
        return false;
    }

    if (typeof obj.success !== "boolean") {
        return false;
    }

    return obj.success === true;
}

type ImgurSuccessResult = {
    data: {
        account_id: string | null
        account_url: string | null
        ad_type: string | null
        ad_url: string | null
        animated: boolean
        bandwidth: number
        datetime: number
        deletehash: string
        description: string
        favorite: false
        has_sound: false
        height: number
        hls: string
        id: string
        in_gallery: boolean
        in_most_viral: boolean
        is_ad: boolean
        nsfw: string | null
        link: string
        tags: string[]
        mp4: string
        name: string
        size: number
        title: string
        type: string
        views: 0
        section: string | null
        vote: number | null
        width: number
    },
    status: number,
    success: true
}

function IsImgurNotSuccessResult(obj: any): obj is ImgurNotSuccessResult {
    if (typeof obj.data !== "object") {
        return false;
    }

    if (typeof obj.status !== "number") {
        return false;
    }

    if (typeof obj.success !== "boolean") {
        return false;
    }

    return obj.success === false;
}

type ImgurNotSuccessResult = {
    data: {
        error: string
    },
    status: number,
    success: false
}