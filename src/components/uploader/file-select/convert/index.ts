import { Message, MessageButton } from "structs/message";
import ImageConverter from "services/converter";
import { ImageFile } from "services/image-hosting-services";
import { FileSelectContext, FileConvertContext, ConvertedFile } from "components/uploader/file-select/convert/ctx";

import DetectAnimation from "components/uploader/file-select/convert/animation-detect";
import AnimationImageConvert from "components/uploader/file-select/convert/animation-convert";
import StaticImageConvert from "components/uploader/file-select/convert/static-convert";

/**
 * Handles the selection and processing of an image file. It infers the file format,
 * detects animation, performs conversion based on whether it's animated or static, displays a preview,
 * updates the selected file state, and notifies the user if the file size changes after conversion.
 * If any error occurs during the process, it logs the error and displays an alert notification.
 * @async
 * @param {FileSelectContext} context - The context object containing necessary dependencies and states
 * for file selection and processing.
 * @returns {Promise<ConvertedFile>}
 */
export default async function (context: FileSelectContext): Promise<ConvertedFile> {
    const {
        translation,
        notifications,
        transcodeLogs,
        file,
    } = context;

    const { t } = translation;

    const LogMessage = (message: string) => transcodeLogs.println(message);

    const sourceFormat = ImageConverter.InferFileFormat(file);

    if (!sourceFormat) {
        const errorMessage = t("uploader.file.format.not-supported");
        LogMessage(errorMessage);
        const confirmButton = new MessageButton(t("main.confirm"));
        notifications.append(
            new Message({
                type: Message.Type.ALERT,
                content: errorMessage,
                buttons: [confirmButton],
            })
        );

        throw new Error(errorMessage);
    }

    console.log(sourceFormat);

    const isAnimation = await DetectAnimation(context);
    const imageFile = new ImageFile(file, sourceFormat);
    const convertContext: FileConvertContext = { ...context, imageFile, sourceFormat };

    console.log("isAnimation: ", isAnimation);
    if (isAnimation) {
        await AnimationImageConvert(convertContext);
    } else {
        await StaticImageConvert(convertContext);
    }

    const convertedFile: ConvertedFile = {
        imageFile,
        isAnimation,
    };

    const fileSizeChanged = ShowFileSizeChangedNotification(convertContext);

    if (!fileSizeChanged && transcodeLogs.visibled) {
        transcodeLogs.clear();
    }

    return convertedFile;
}

/**
 * Checks if the file size has changed after processing and displays a notification if it has.
 * @param {FileConvertContext} context - The context containing the image and notification utilities.
 * @returns {boolean} - True if a file size changed notification was displayed, false otherwise.
 */
function ShowFileSizeChangedNotification(context: FileConvertContext): boolean {
    const {
        imageFile,
        transcodeLogs,
        translation,
        notifications,
    } = context;

    const { t } = translation;

    if (imageFile.processed) {
        const originalSize = FormatFileSize(imageFile.original.file.size);
        const processedSize = FormatFileSize(imageFile.processed.file.size);

        if (originalSize !== processedSize) {
            const confirmButton = new MessageButton(t("main.confirm"));
            confirmButton.on("Clicked", () => {
                transcodeLogs.clear();
            });

            const sizeChangedMessage = new Message({
                type: Message.Type.ALERT,
                content: t("uploader.file.notification.converted-size", { originalSize, processedSize }),
                buttons: [confirmButton]
            });

            notifications.append(sizeChangedMessage);
            return true;
        }
    }

    return false;
}

/**
 * Formats a file size in bytes into a human-readable string.
 * @param {number} bytes - The file size in bytes.
 * @param {number} [decimals=2] - The number of decimal places to display.
 * @returns {string} - The formatted file size string.
 * @throws {Error} If the file size is negative.
 */
function FormatFileSize(bytes: number, decimals: number = 2): string {
    if (bytes < 0) {
        throw new Error("File size cannot be negative.");
    }

    const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
    if (bytes === 0) return `0 ${sizes[0]}`;

    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const formattedSize = parseFloat((bytes / Math.pow(k, i)).toFixed(decimals));

    return `${formattedSize} ${sizes[i]}`;
}