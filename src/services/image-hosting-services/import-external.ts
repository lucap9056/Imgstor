import { FormatNames } from "services/converter/file-formats";
import { Features, ImageFile } from "services/image-hosting-services";
import ImgstorDB, { ImgstorImage } from "services/imgstor-db";

export interface ImageData {
    imageUrl: string
    previewUrl: string
}

export default class ImportExternal {
    public static readonly NAME = "Import";
    public readonly NAME = ImportExternal.NAME;

    public readonly SupportedStaticFormats: FormatNames[] = [];
    public readonly SupportedDynamicFormats: FormatNames[] = [];

    public readonly id: string;
    public readonly enabled: boolean;
    public readonly features: Features = {
        Save: false,
        File: false,
        Tags: true,
        Description: true
    };

    constructor(id: string, enabled: boolean) {
        this.id = id;
        this.enabled = enabled;
    }

    public async Upload(_: boolean, file: ImageFile): Promise<ImgstorImage> {
        const { id } = this;

        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = () => {
                const { imageUrl, previewUrl }: ImageData = JSON.parse(reader.result as string);

                const image = new Image();

                image.onload = () => {

                    resolve({
                        ...ImgstorImage.Empty,
                        width: file.Width.toString(),
                        height: file.Height.toString(),
                        link: imageUrl,
                        preview: previewUrl,
                        title: ImgstorDB.EncodeText(file.Title),
                        description: ImgstorDB.EncodeText(file.Description),
                        create_time: new Date().getTime().toString(),
                        hosting_service: id
                    });

                }

                image.onerror = reject;

                image.src = imageUrl;
            }

            reader.onerror = reject;

            reader.readAsText(file.Original.file);
        });
    }

    public async Delete(_: ImgstorImage): Promise<void> {
        return;
    }

    public Preview(image: ImgstorImage): string {
        return image.preview;
    }
}