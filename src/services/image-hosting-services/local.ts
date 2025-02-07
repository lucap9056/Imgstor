import { FormatNames } from "services/converter/file-formats";
import { ImageFile, Features } from "services/image-hosting-services";
import ImgstorDB, { ImgstorImage } from "services/imgstor-db";


export default class Local {
    public static readonly NAME = "Local";
    public readonly NAME = Local.NAME;

    public readonly SupportedStaticFormats: FormatNames[] = ["WebP", "JPEG", "PNG", "TIFF", "GIF"];
    public readonly SupportedDynamicFormats: FormatNames[] = [
        "WEBM"];

    public readonly id: string;
    public readonly enabled: boolean;
    public readonly features: Features = {
        Save: false,
        File: true,
        Tags: false,
        Description: false
    };

    constructor(id: string, enabled: boolean) {
        this.id = id;
        this.enabled = enabled;
    }

    public async Upload(_: boolean, imageFile: ImageFile): Promise<ImgstorImage> {
        const url = URL.createObjectURL((imageFile.Processed || imageFile.Original).file);
        const image: ImgstorImage = {
            id: "",
            name: imageFile.Original.file.name,
            type: imageFile.Original.file.type,
            width: imageFile.Width.toString(),
            height: imageFile.Height.toString(),
            link: url,
            preview: url,
            title: ImgstorDB.EncodeText(imageFile.Title),
            description: ImgstorDB.EncodeText(imageFile.Description),
            del: url,
            create_time: new Date().getTime().toString(),
            file_id: "",
            hosting_service: this.id
        }

        return image;
    }

    public async Delete(image: ImgstorImage): Promise<void> {
        URL.revokeObjectURL(image.del);
    }

    public Preview(image: ImgstorImage): string {
        return image.preview;
    }
}