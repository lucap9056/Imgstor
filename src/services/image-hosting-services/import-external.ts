import { FormatNames } from "services/converter/file-formats";
import { ServiceFeatures, ImageFile } from "services/image-hosting-services";
import ImgstorDB, { ImgstorImage } from "services/imgstor-db";

export interface ImageData {
    imageUrl: string
    previewUrl: string
}

export default class ImportExternal {
    public static readonly NAME = "Import";
    public readonly NAME = ImportExternal.NAME;

    public readonly SupportedStaticFormats: FormatNames[] = [];
    public readonly SupportedAnimationFormats: FormatNames[] = [];

    public readonly hostingServiceId: string;
    public readonly isEnabled: boolean;
    public readonly features: ServiceFeatures = {
        save: false,
        file: false,
        tags: true,
        description: true
    };

    constructor(id: string, isEnabled: boolean) {
        this.hostingServiceId = id;
        this.isEnabled = isEnabled;
    }

    public async Upload(_: boolean, file: ImageFile): Promise<ImgstorImage> {
        const { hostingServiceId } = this;

        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = () => {
                const { imageUrl, previewUrl }: ImageData = JSON.parse(reader.result as string);

                const image = new Image();

                image.onload = () => {

                    resolve({
                        ...ImgstorImage.Empty,
                        width: file.width.toString(),
                        height: file.height.toString(),
                        imageUrl: imageUrl,
                        previewUrl: previewUrl,
                        title: ImgstorDB.EncodeText(file.title),
                        description: ImgstorDB.EncodeText(file.description),
                        createTime: new Date().getTime().toString(),
                        hostingServiceId: hostingServiceId
                    });

                }

                image.onerror = reject;

                image.src = imageUrl;
            }

            reader.onerror = reject;

            reader.readAsText(file.original.file);
        });
    }

    public async Delete(_: ImgstorImage): Promise<void> {
        return;
    }

    public Preview(image: ImgstorImage): string {
        return image.previewUrl;
    }
}