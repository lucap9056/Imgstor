import { FormatNames } from "services/converter/file-formats";
import { Features, ImageFile } from "services/image-hosting-services";
import ImgstorDB, { ImgstorImage } from "services/imgstor-db";


export default class Imgur {
    public static readonly NAME = "Imgur";
    public readonly NAME = Imgur.NAME;
    public readonly SupportedStaticFormats: FormatNames[] = ["JPEG", "PNG", "TIFF", "GIF"];
    public readonly SupportedDynamicFormats: FormatNames[] = ["MP4", "WEBM", "GIF", "APNG", "MPEG", "MOV", "MKV", "FLV", "AVI", "WMV"];

    public readonly id: string;
    public readonly enabled: boolean;
    private readonly clientId: string;
    public readonly features: Features = {
        Save: true,
        File: true,
        Tags: true,
        Description: true
    };
    constructor(id: string, enabled: boolean, clientId: string) {
        this.id = id;
        this.enabled = enabled;
        this.clientId = clientId;
    }

    public async Upload(_: boolean, imageFile: ImageFile): Promise<ImgstorImage> {

        const { id, clientId } = this;

        const file = (imageFile.Processed || imageFile.Original).file;

        if (file.size > 20 * Math.pow(1024, 2)) {
            throw new Error("the file size is too large");
        }

        const form = new FormData();

        form.append("title", imageFile.Title);
        form.append("description", imageFile.Description);
        form.append("image", file);

        const res = await fetch("https://api.imgur.com/3/image", {
            method: "POST",
            headers: {
                "Authorization": `Client-ID ${clientId}`
            },
            body: form,
        });

        if (!res.ok) {
            throw res.text().then((text) => new Error(text));
        }

        const result = await res.json().then((r) => r as ImgurResult);

        const image: ImgstorImage = {
            id: "",
            name: imageFile.Original.file.name,
            type: imageFile.Original.file.type,
            width: result.data.width.toString(),
            height: result.data.height.toString(),
            link: result.data.link,
            preview: `https://i.imgur.com/${result.data.id}m.jpg`,
            title: ImgstorDB.EncodeText(imageFile.Title),
            description: ImgstorDB.EncodeText(imageFile.Description),
            del: result.data.deletehash,
            create_time: new Date().getTime().toString(),
            file_id: "",
            hosting_service: id,
        }

        return image;
    }

    public Delete(image: ImgstorImage): Promise<void> {

        const { clientId } = this;

        return new Promise(async () => {
            await fetch(`https://api.imgur.com/3/image/${image.del}`, {
                method: "DELETE",
                headers: {
                    "Authorization": `Client-ID ${clientId}`
                },
                redirect: 'follow'
            })
        });
    }

    public Preview(image: ImgstorImage): string {
        return image.preview;
    }
}

export type ImgurResult = {
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
    success: boolean
}