import { FileFormat, FormatNames } from "services/converter/file-formats";
import { ImgstorImage } from "services/imgstor-db";

export class ImageFile {
    private originalFile: File;
    private processedFile?: File;
    private title: string = "";
    private description: string = "";
    private width: number = 0;
    private height: number = 0;
    private fileFormat: {
        original: FileFormat
        processed?: FileFormat
    };

    constructor(file: File, format: FileFormat) {
        this.originalFile = file;
        this.fileFormat = {
            original: format
        };
    }

    public SetProcessedFile(file: File, format: FileFormat) {
        this.processedFile = file;
        this.fileFormat.processed = format;
    }

    public SetSize(width: number, height: number): void {
        this.width = width;
        this.height = height;
    }

    public set Title(title: string) {
        this.title = title;
    }

    public set Description(description: string) {
        this.description = description;
    }

    public get Original(): { file: File, format: FileFormat } {
        const { originalFile, fileFormat } = this;
        return {
            file: originalFile,
            format: fileFormat.original
        };
    }

    public get Processed(): { file: File, format: FileFormat } | undefined {
        const { processedFile, fileFormat } = this;
        if (processedFile && fileFormat.processed) {
            return {
                file: processedFile,
                format: fileFormat.processed
            }
        };
    }

    public get Title(): string {
        return this.title;
    }

    public get Description(): string {
        return this.description;
    }

    public get Width(): number {
        return this.width;
    }

    public get Height(): number {
        return this.height;
    }
}

export interface Features {
    Save: boolean
    File: boolean
    Tags: boolean
    Description: boolean
}

export interface ImageHostingService {
    NAME: string
    id: string
    enabled: boolean
    features: Features
    SupportedStaticFormats: FormatNames[]
    SupportedDynamicFormats: FormatNames[]

    Upload(save: boolean, image: ImageFile): Promise<ImgstorImage>;
    Delete(image: ImgstorImage): Promise<void>;
    Preview(image: ImgstorImage): Promise<string> | string;
}
