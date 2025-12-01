import { FormatNames, FORMATS } from "services/converter/file-formats";
import { FileConvertContext } from "components/uploader/file-select/convert/ctx";
import { Message, MessageButton } from "structs/message";
import { useEffect, useState } from "react";

import styles from "./style.module.scss";

interface Props {
    formats: FormatNames[]
    update: (format: FormatNames) => void
}

const SelectFormat: React.FC<Props> = ({ formats, update }) => {

    const [format, SetFormat] = useState(formats[0]);
    const [visible, SetVisible] = useState(false);

    useEffect(() => {
        SetVisible(false);
        update(format);
    }, [format]);

    const Visible = () => {
        SetVisible(true);
    }

    return <>
        <span className={styles.current_format} onClick={Visible}>{format}</span>
        {visible && <ul className={styles.format_list}>
            {formats.map(
                (name) => <li className={styles.format} key={name} onClick={() => SetFormat(name)}>{name}</li>
            )}
        </ul>}
    </>
}

export default async function (ctx: FileConvertContext): Promise<void> {
    const {
        alerts,
        hostingService,
        translation,
        sourceFormat,
    } = ctx;

    const { t } = translation;

    const hostingServiceSupported = hostingService.SupportedAnimationFormats.includes(sourceFormat.name);
    console.log("Hosting service supported: ", hostingServiceSupported);

    if (hostingServiceSupported) {
        await OnlyConvertPreviewImage(ctx);
    }
    else {

        return new Promise((resolve, reject) => {

            let targetFormat: FormatNames = hostingService.SupportedAnimationFormats[0];
            const Update = (format: FormatNames) => targetFormat = format;

            const cancel = new MessageButton(t("main.cancel"));
            cancel.once("Clicked", () => {
                reject(new Error(t("uploader.notification.converter.cancel")));
            });

            const confirm = new MessageButton(t("main.confirm"));
            confirm.once("Clicked", async () => {
                try {
                    await ConfirmConvert(ctx, targetFormat);
                    resolve();
                }
                catch (err) {
                    reject(err);
                }
            })

            alerts.append(
                new Message({
                    type: "ALERT",
                    content: <div className={styles.message}>
                        {t("uploader.file.alert.converter.animation")}
                        <br />
                        {t("uploader.file.alert.converter.animation.ex")}
                        <br />
                        {t("uploader.file.alert.converter.animation.target")
                        } {
                            <SelectFormat formats={hostingService.SupportedAnimationFormats} update={Update} />
                        }
                    </div>,
                    buttons: [cancel, confirm]
                })
            );

        });

    }
}

async function ConfirmConvert(ctx: FileConvertContext, targetFormatName: FormatNames) {
    const {
        transcodeLogs,
        notifications,
        translation,
        messages,
        fileConverter,
        file,
        imageFile,
        sourceFormat
    } = ctx;

    const { t } = translation;

    const targetFormat = FORMATS[targetFormatName];

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

    const preprocessed = await fileConverter.PreprocessAnimation(
        transcode.abortController,
        file,
        sourceFormat,
        targetFormat,
        LogMessage
    );

    if (preprocessed) {
        const { file, fileFormat } = preprocessed.firstFrame;
        imageFile.SetPreviewFile(file, fileFormat);
    }

    const { converted, firstFrame } = (preprocessed) ?
        await fileConverter.ConvertAnimatedImage(
            transcode.abortController,
            preprocessed.converted.file,
            preprocessed.converted.fileFormat,
            targetFormat,
            false,
            LogMessage
        ) :
        await fileConverter.ConvertAnimatedImage(
            transcode.abortController,
            file,
            sourceFormat,
            targetFormat,
            true,
            LogMessage
        );

    if (firstFrame) {
        const { file, fileFormat } = firstFrame;
        imageFile.SetPreviewFile(file, fileFormat);
    }

    transcode.done();
    message.remove();

    messages.delete(message.id);
    if (converted.file.size === 0) {
        throw new Error("fail");
    }
    imageFile.SetProcessedFile(converted.file, converted.fileFormat);
}

async function OnlyConvertPreviewImage(ctx: FileConvertContext) {
    const {
        file,
        imageFile,
        sourceFormat,
        messages,
        notifications,
        fileConverter,
        transcodeLogs,
        translation,
    } = ctx;

    console.log("Only convert preview iamge");

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

    const { firstFrameFile, firstFrameFileFormat } = await fileConverter.GenerateAnimatedImagePreview(
        transcode.abortController,
        file,
        sourceFormat,
        LogMessage
    );

    imageFile.SetPreviewFile(firstFrameFile, firstFrameFileFormat);


    transcode.done();
    message.remove();

    messages.delete(message.id);

}