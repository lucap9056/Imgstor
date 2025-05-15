import { FormatNames } from "services/converter/file-formats";
import { ImageFile, ServiceFeatures } from "services/image-hosting-services";
import ImgstorDB, { ImgstorImage } from "services/imgstor-db";


export default class Local {
    public static readonly NAME = "Local";
    public readonly NAME = Local.NAME;

    public readonly SupportedStaticFormats: FormatNames[] = ["WebP", "JPEG", "PNG", "TIFF", "GIF"];
    public readonly SupportedAnimationFormats: FormatNames[] = ["WEBM"];

    public readonly hostingServiceId: string;
    public readonly isEnabled: boolean;
    public readonly features: ServiceFeatures = {
        save: false,
        file: true,
        tags: false,
        description: false
    };

    constructor(id: string, isEnabled: boolean) {
        this.hostingServiceId = id;
        this.isEnabled = isEnabled;
    }

    public async Upload(_: boolean, imageFile: ImageFile): Promise<ImgstorImage> {
        const url = URL.createObjectURL((imageFile.processed || imageFile.original).file);

        return {
            imageId: "",
            name: imageFile.original.file.name,
            mimeType: imageFile.original.file.type,
            width: imageFile.width.toString(),
            height: imageFile.height.toString(),
            imageUrl: url,
            previewUrl: url,
            deleteImageUrl: url,
            deletePreviewUrl: url,
            title: ImgstorDB.EncodeText(imageFile.title),
            description: ImgstorDB.EncodeText(imageFile.description),
            createTime: new Date().getTime().toString(),
            fileId: "",
            hostingServiceId: this.hostingServiceId
        }
    }

    public async Delete(image: ImgstorImage): Promise<void> {
        URL.revokeObjectURL(image.imageUrl);
    }

    public Preview(image: ImgstorImage): string {
        return image.previewUrl;
    }
}