import { FormatNames } from "services/converter/file-formats";
import { ServiceFeatures, ImageFile } from "services/image-hosting-services";
import ImgstorDB, { ImgstorImage } from "services/imgstor-db";


export default class Catbox {
    public static readonly NAME = "Catbox";
    public readonly NAME = Catbox.NAME;

    private static readonly UPLOAD_SIZE_LIMIT_BYTES = 200 * Math.pow(1024, 2);//200MB

    public readonly SupportedStaticFormats: FormatNames[] = ["WebP", "PNG", "JPEG", "TIFF", "AVIF", "BMP"];//svg heif heic
    public readonly SupportedAnimationFormats: FormatNames[] = ["WebP", "GIF", "WEBM", "APNG", "MP4", "MPEG", "MOV", "MKV", "FLV", "AVI", "WMV", "OGG"];

    public readonly hostingServiceId: string;
    public readonly isEnabled: boolean;
    public readonly proxy: string;
    private readonly userhash: string;
    private readonly separatePreviewUpload: boolean;
    public readonly features: ServiceFeatures = {
        save: true,
        file: true,
        tags: true,
        description: true
    };

    constructor(id: string, isEnabled: boolean, proxy: string, userhash: string, separatePreviewUpload: boolean) {
        this.hostingServiceId = id;
        this.isEnabled = isEnabled;
        this.proxy = proxy;
        this.userhash = userhash;
        this.separatePreviewUpload = separatePreviewUpload;
    }

    public async Upload(shouldSave: boolean, imageFile: ImageFile): Promise<ImgstorImage> {
        const { hostingServiceId, proxy, userhash, separatePreviewUpload } = this;


        const fileToUpload = imageFile.processed?.file || imageFile.original.file;

        if (fileToUpload.size > Catbox.UPLOAD_SIZE_LIMIT_BYTES) {
            throw new Error(`Image file size exceeds the limit of ${Catbox.UPLOAD_SIZE_LIMIT_BYTES / Math.pow(1024, 2)}MB.`);
        }

        if (!shouldSave) {
            return await this.NoSaveUpload(fileToUpload, imageFile);
        }

        if (separatePreviewUpload) {

            if (!imageFile.preview) {
                throw new Error("Preview image file is required when separate preview upload is enabled.");
            }
            const previewFile = imageFile.preview.file;

            if (previewFile.size > Catbox.UPLOAD_SIZE_LIMIT_BYTES) {
                throw new Error(`Preview image file size exceeds the limit of ${Catbox.UPLOAD_SIZE_LIMIT_BYTES / Math.pow(1024, 2)}MB.`);
            }

        }

        const mainRequest = (() => {

            const formData = new FormData();
            formData.append("userhash", userhash);
            formData.append("reqtype", "fileupload");
            formData.append("fileToUpload", fileToUpload);
            return fetch(proxy, { method: "POST", body: formData });
        })();

        const previewRequest = (() => {
            if (separatePreviewUpload && imageFile.preview) {
                return Catbox.ConvertPngToWebpThumbnail(imageFile.preview.file).then((thumbnail) => {
                    const formData = new FormData();
                    formData.append("userhash", userhash);
                    formData.append("reqtype", "fileupload");
                    formData.append("fileToUpload", thumbnail);
                    return fetch(proxy, { method: "POST", body: formData });
                });
            }
        })();

        try {

            const imageUrl = await mainRequest.then(async (response) => {
                if (response.ok) return response.text();
                throw await response.text().then((message) => new Error(message));
            });
            const previewUrl = previewRequest ? await previewRequest.then(async (response) => {
                if (response.ok) return response.text();
                throw await response.text().then((message) => new Error(message));
            }) : undefined;

            return {
                imageId: "",
                name: imageFile.original.file.name,
                mimeType: imageFile.original.file.type,
                width: imageFile.width.toString(),
                height: imageFile.height.toString(),
                imageUrl: imageUrl,
                previewUrl: previewUrl || imageUrl,
                deleteImageUrl: userhash,
                deletePreviewUrl: userhash,
                title: ImgstorDB.EncodeText(imageFile.title),
                description: ImgstorDB.EncodeText(imageFile.description),
                createTime: new Date().getTime().toString(),
                fileId: "",
                hostingServiceId: hostingServiceId,
            };
        } catch (err) {
            throw new Error(`Failed to upload image: ${(err as Error).message}`);
        }
    }

    private async NoSaveUpload(fileToUpload: File, imageFile: ImageFile): Promise<ImgstorImage> {
        const { proxy, hostingServiceId } = this;

        const formData = new FormData();
        formData.append("reqtype", "fileupload");
        formData.append("fileToUpload", fileToUpload);

        try {
            const response = await fetch(proxy, {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                throw response.text().then((message) => new Error(message));
            }

            const result = await response.text();

            return {
                imageId: "",
                name: imageFile.original.file.name,
                mimeType: imageFile.original.file.type,
                width: imageFile.width.toString(),
                height: imageFile.height.toString(),
                imageUrl: result,
                previewUrl: result,
                deleteImageUrl: "",
                deletePreviewUrl: "",
                title: ImgstorDB.EncodeText(imageFile.title),
                description: ImgstorDB.EncodeText(imageFile.description),
                createTime: new Date().getTime().toString(),
                fileId: "",
                hostingServiceId: hostingServiceId,
            };
        } catch (error: any) {
            throw new Error(`Failed to upload image: ${error.message}`);
        }
    }

    public async Delete(image: ImgstorImage): Promise<void> {
        const { proxy } = this;
        const { imageUrl, deleteImageUrl, previewUrl, deletePreviewUrl } = image;

        const deletePromises: Promise<Response>[] = [];

        if (deleteImageUrl !== "" && imageUrl !== "") {
            const file = imageUrl.replace(/.*\//g, '');

            const form = new FormData();
            form.append("reqtype", "deletefiles");
            form.append("userhash", deleteImageUrl);
            form.append("files", file);

            deletePromises.push(
                fetch(proxy, {
                    method: "POST",
                    body: form
                })
            );
        }

        if (imageUrl != previewUrl && deletePreviewUrl !== "" && previewUrl !== "") {
            const previewFile = previewUrl.replace(/.*\//g, '');
            const previewForm = new FormData();
            previewForm.append("reqtype", "deletefiles");
            previewForm.append("userhash", deletePreviewUrl);
            previewForm.append("files", previewFile);

            deletePromises.push(
                fetch(proxy, {
                    method: "POST",
                    body: previewForm
                })
            );
        }

        await Promise.all(deletePromises);
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