import { MessageButton, Message } from "structs/message";
import { FileSelectContext } from "components/uploader/file-select/convert/ctx";

/**
 * Detects if a given file is an animated image. It displays a notification during the detection process
 * with an option to abort.
 * @async
 * @param {FileSelectContext} context - The context object containing necessary dependencies for file processing.
 * @returns {Promise<boolean>} - A promise that resolves to true if the file is animated, and false otherwise.
 */
export default async function DetectAnimation(context: FileSelectContext): Promise<boolean> {
    const {
        translation,
        transcodeLogs,
        notifications,
        fileConverter,
        file,
    } = context;

    const { t } = translation;

    const detectingLog = transcodeLogs.add();
    const LogMessage = (msg: string) => transcodeLogs.println(msg);

    const abortButton = new MessageButton(t("main.abort"));
    const detectionMessage = new Message({
        type: Message.Type.NORMAL,
        content: t("uploader.file.notification.animation-detecting"),
        buttons: [abortButton]
    });

    notifications.append(detectionMessage);
    const isAnimated = await fileConverter.DetectAnimation(detectingLog.abortController, file, LogMessage);
    detectionMessage.remove();
    detectingLog.remove();

    return isAnimated;
}