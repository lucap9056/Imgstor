import { FormatNames } from "services/converter/file-formats";
import { ServiceFeatures, ImageFile } from "services/image-hosting-services";
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

    private static readonly UPLOAD_SIZE_LIMIT_BYTES = 5 * Math.pow(1024, 2); //5MB

    public readonly SupportedStaticFormats: FormatNames[] = ["WebP", "PNG", "JPEG", "TIFF", "AVIF", "BMP"];//svg heif heic
    public readonly SupportedAnimationFormats: FormatNames[] = ["GIF", "WEBM", "APNG", "MP4", "MPEG", "MOV", "MKV", "FLV", "AVI", "WMV", "OGG"];

    public readonly hostingServiceId: string;
    public readonly isEnabled: boolean;
    private readonly proxy: string;
    private readonly token: string;
    private readonly separatePreviewUpload: boolean;
    public readonly features: ServiceFeatures = {
        save: true,
        file: true,
        tags: true,
        description: true
    };
    constructor(id: string, isEnabled: boolean, proxy: string, token: string, separatePreviewUpload: boolean) {
        this.hostingServiceId = id;
        this.isEnabled = isEnabled;
        this.proxy = proxy;
        this.token = token;
        this.separatePreviewUpload = separatePreviewUpload;
    }

    public async Upload(shouldSave: boolean, imageFile: ImageFile): Promise<ImgstorImage> {
        const { hostingServiceId, proxy, token, separatePreviewUpload } = this;

        const file = (imageFile.processed || imageFile.original).file;

        if (file.size > Smms.UPLOAD_SIZE_LIMIT_BYTES) {
            throw new Error(`Image file size exceeds the limit of ${Smms.UPLOAD_SIZE_LIMIT_BYTES / Math.pow(1024, 2)}MB.`);
        }


        if (shouldSave && separatePreviewUpload) {
            if (!imageFile.preview) {
                throw new Error("Preview image file is required when separate preview upload is enabled.");
            }

            const previewFile = imageFile.preview.file;

            if (previewFile.size > Smms.UPLOAD_SIZE_LIMIT_BYTES) {
                throw new Error(`Preview image file size exceeds the limit of ${Smms.UPLOAD_SIZE_LIMIT_BYTES / Math.pow(1024, 2)}MB.`);
            }
        }

        const mainRequest = (() => {

            const form = new FormData();
            form.append("smfile", file);
            return fetch(`${proxy}/api/v2/upload`, {
                method: "POST",
                headers: {
                    "Authorization": token
                },
                body: form
            });
        })();

        const previewRequest = (() => {
            if (shouldSave && separatePreviewUpload && imageFile.preview) {
                return Smms.ConvertPngToWebpThumbnail(imageFile.preview.file).then((thumbnail) => {
                    const form = new FormData();
                    form.append("smfile", thumbnail);
                    return fetch(`${proxy}/api/v2/upload`, {
                        method: "POST",
                        headers: {
                            "Authorization": token
                        },
                        body: form
                    });
                });
            }
        })();

        const form = new FormData();
        form.append("smfile", file);

        try {
            const mainResult: SmmsUploadResult = await mainRequest.then(res => res.json());

            const previewResult = previewRequest ?
                await previewRequest.then(res => res.json()) : undefined;

            return {
                imageId: "",
                name: imageFile.original.file.name,
                mimeType: imageFile.original.file.type,
                width: mainResult.data.width.toString(),
                height: mainResult.data.height.toString(),
                imageUrl: mainResult.data.url,
                previewUrl: previewResult.data.url || mainResult.data.url,
                deleteImageUrl: mainResult.data.hash,
                deletePreviewUrl: previewResult.data.url || mainResult.data.url,
                title: ImgstorDB.EncodeText(imageFile.title),
                description: ImgstorDB.EncodeText(imageFile.description),
                createTime: new Date().getTime().toString(),
                fileId: "",
                hostingServiceId: hostingServiceId
            }

        }
        catch (err) {
            throw new Error(`Failed to upload image: ${(err as Error).message}`);
        }
    }

    public async Delete(image: ImgstorImage): Promise<void> {
        const { proxy, token } = this;

        const res = await fetch(`${proxy}/api/v2/delete/${image.deleteImageUrl}`, {
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
        return image.previewUrl;
    }


    private static async ConvertPngToWebpThumbnail(pngFile: File): Promise<File> {
        const MAX_DIMENSION = 640;
        const WEBP_MIME_TYPE = "image/webp";
        const THUMBNAIL_FILE_NAME = "thumbnail.webp";

        return new Promise((resolve, reject) => {
            const img = new Image();

            img.onerror = () => {
                reject(new Error("Failed to load the image."));
            };

            img.onload = () => {
                let currentWidth = img.width;
                let currentHeight = img.height;

                if (currentWidth > MAX_DIMENSION) {
                    currentHeight *= (MAX_DIMENSION / currentWidth);
                    currentWidth = MAX_DIMENSION;
                }
                if (currentHeight > MAX_DIMENSION) {
                    currentWidth *= (MAX_DIMENSION / currentHeight);
                    currentHeight = MAX_DIMENSION;
                }

                const canvas = document.createElement('canvas');
                canvas.width = currentWidth;
                canvas.height = currentHeight;
                const context = canvas.getContext('2d');

                if (!context) {
                    reject(new Error("Could not get 2D rendering context."));
                    URL.revokeObjectURL(img.src);
                    return;
                }

                context.drawImage(img, 0, 0, currentWidth, currentHeight);

                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            const webpThumbnail = new File([blob], THUMBNAIL_FILE_NAME, { type: WEBP_MIME_TYPE });
                            resolve(webpThumbnail);
                        } else {
                            reject(new Error("Failed to convert canvas to blob."));
                        }
                    },
                    WEBP_MIME_TYPE
                );

                URL.revokeObjectURL(img.src);
            };

            img.src = URL.createObjectURL(pngFile);
        });
    }
}

