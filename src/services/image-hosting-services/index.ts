import { FileFormat, FormatNames } from "services/converter/file-formats";
import { ImgstorImage } from "services/imgstor-db";

export class ImageFile {
    private originalFile: File;
    private processedFile?: File;
    private previewFile?: File;
    private imageTitle: string = "";
    private imageDescription: string = "";
    private imageWidth: number = 0;
    private imageHeight: number = 0;
    private fileFormats: {
        original: FileFormat;
        processed?: FileFormat;
        preview?: FileFormat;
    };

    /**
     * Creates a new instance of the ImageFile class.
     * @param file The original File object.
     * @param format The format of the original file.
     */
    constructor(file: File, format: FileFormat) {
        this.originalFile = file;
        this.fileFormats = {
            original: format,
        };
    }

    /**
     * Sets the processed file and its format.
     * @param file The processed File object.
     * @param format The format of the processed file.
     */
    public SetProcessedFile(file: File, format: FileFormat): void {
        this.processedFile = file;
        this.fileFormats.processed = format;
    }

    public SetPreviewFile(file: File, format: FileFormat): void {
        this.previewFile = file;
        this.fileFormats.preview = format;
    }

    /**
     * Sets the width and height of the image.
     * @param width The width of the image in pixels.
     * @param height The height of the image in pixels.
     */
    public SetImageSize(width: number, height: number): void {
        this.imageWidth = width;
        this.imageHeight = height;
    }

    /**
     * Sets the title of the image.
     * @param title The title string.
     */
    public set title(title: string) {
        this.imageTitle = title;
    }

    /**
     * Sets the description of the image.
     * @param description The description string.
     */
    public set description(description: string) {
        this.imageDescription = description;
    }

    /**
     * Gets the original file and its format.
     * @returns An object containing the original File and its FileFormat.
     */
    public get original(): { file: File; format: FileFormat } {
        return {
            file: this.originalFile,
            format: this.fileFormats.original,
        };
    }

    /**
     * Gets the processed file and its format, if available.
     * @returns An object containing the processed File and its FileFormat, or undefined if no processed file exists.
     */
    public get processed(): { file: File; format: FileFormat } | undefined {
        if (this.processedFile && this.fileFormats.processed) {
            return {
                file: this.processedFile,
                format: this.fileFormats.processed,
            };
        }
        return undefined;
    }

    public get preview(): { file: File; format: FileFormat } | undefined {
        if (this.previewFile && this.fileFormats.preview) {
            return {
                file: this.previewFile,
                format: this.fileFormats.preview,
            };
        }
        return undefined;
    }

    /**
     * Gets the title of the image.
     * @returns The title string.
     */
    public get title(): string {
        return this.imageTitle;
    }

    /**
     * Gets the description of the image.
     * @returns The description string.
     */
    public get description(): string {
        return this.imageDescription;
    }

    /**
     * Gets the width of the image.
     * @returns The width in pixels.
     */
    public get width(): number {
        return this.imageWidth;
    }

    /**
     * Gets the height of the image.
     * @returns The height in pixels.
     */
    public get height(): number {
        return this.imageHeight;
    }
}

export interface ServiceFeatures {
    save: boolean;
    file: boolean;
    tags: boolean;
    description: boolean;
}

export interface ImageHostingService {
    NAME: string;
    hostingServiceId: string;
    isEnabled: boolean;
    features: ServiceFeatures;
    SupportedStaticFormats: FormatNames[];
    SupportedAnimationFormats: FormatNames[];

    /**
     * Uploads an image to the hosting service.
     * @param shouldSave Indicates whether the image should be saved permanently.
     * @param image The ImageFile object containing the image data.
     * @returns A Promise that resolves to an ImgstorImage object representing the uploaded image.
     * @throws Error if the upload fails.
     */
    Upload(shouldSave: boolean, image: ImageFile): Promise<ImgstorImage>;

    /**
     * Deletes an image from the hosting service.
     * @param image The ImgstorImage object representing the image to delete.
     * @returns A Promise that resolves when the deletion is successful.
     * @throws Error if the deletion fails.
     */
    Delete(image: ImgstorImage): Promise<void>;

    /**
     * Retrieves a preview URL or data for the given image.
     * @param image The ImgstorImage object for which to retrieve the preview.
     * @returns A Promise that resolves to the preview URL (string) or the preview data (string), or a string directly.
     * @throws Error if retrieving the preview fails.
     */
    Preview(image: ImgstorImage): Promise<string> | string;
}