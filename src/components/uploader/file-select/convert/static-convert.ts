import { FileConvertContext } from "components/uploader/file-select/convert/ctx";
import { FORMATS } from "services/converter/file-formats";
import { Message, MessageButton } from "structs/message";


export default async function (ctx: FileConvertContext) {
    const {
        hostingService,
        transcodeLogs,
        translation,
        notifications,
        fileConverter,
        file,
        imageFile,
        messages,
        sourceFormat,
    } = ctx;

    const { t } = translation;


    const transcode = transcodeLogs.add();
    const LogMessage = (msg: string) => transcodeLogs.println(msg);

    const abort = new MessageButton(t("main.abort"));
    abort.on("Clicked", () => transcode.abortController.abort());
    const message = new Message({
        type: Message.Type.NORMAL,
        content: t("uploader.file.notifiaction.transcoding"),
        buttons: [abort]
    });

    notifications.append(message);
    messages.set(message.id, message);

    if (hostingService.SupportedStaticFormats.includes(sourceFormat.name)) {

        const previewFile = await fileConverter.GenerateStaticImagePreview(
            transcode.abortController,
            file,
            sourceFormat,
            LogMessage
        );

        imageFile.SetPreviewFile(previewFile, FORMATS["PNG"]);

    }
    else {

        const targetFormatName = hostingService.SupportedStaticFormats[0];
        const targetFormat = FORMATS[targetFormatName];

        const [processesFile, previewFile] = await Promise.all([
            fileConverter.ConvertStaticImage(
                transcode.abortController,
                file,
                targetFormat,
                LogMessage
            ),
            fileConverter.GenerateStaticImagePreview(
                transcode.abortController,
                file,
                sourceFormat,
                LogMessage
            )
        ]);

        if (processesFile.size === 0) {
            throw new Error("fail");
        }

        imageFile.SetProcessedFile(processesFile, targetFormat);
        imageFile.SetPreviewFile(previewFile, FORMATS["PNG"]);

    }

    transcode.done();
    message.remove();
    messages.delete(message.id);
}