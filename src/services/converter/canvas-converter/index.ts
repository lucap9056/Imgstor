import { FileFormat, FormatNames } from "services/converter/file-formats";

const SUPPORTED_FORMATS: FormatNames[] = [
    "JPEG",
    "PNG",
    "WebP"
];

function ConvertImage(file: File, target_format: FileFormat): Promise<File> {

    const reader = new FileReader();

    return new Promise((resolve, reject) => {

        reader.onload = () => {

            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext("2d");

                if (!ctx) {
                    return reject(new Error());
                }

                canvas.width = img.width;
                canvas.height = img.height;

                ctx.drawImage(img, 0, 0);

                canvas.toBlob((blob) => {
                    if (!blob) {
                        reject(new Error('Image conversion failed'));
                        return;
                    }

                    const { fileExtension, mimeType } = target_format;

                    const fileName = file.name.replace(/\.[^/.]+$/, fileExtension[0]);

                    const convertedFile = new File([blob], fileName, { type: mimeType });
                    resolve(convertedFile);
                }, target_format.mimeType);
            }

            img.onerror = reject;
            img.src = reader.result as string;
        }

        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

}

function IsSupported(source_format: FileFormat, target_format: FileFormat): boolean {
    return SUPPORTED_FORMATS.includes(source_format.name) && SUPPORTED_FORMATS.includes(target_format.name);
}

export default {
    IsSupported,
    ConvertImage
}