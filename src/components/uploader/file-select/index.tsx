import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Message, MessageButton } from "utils/message";

import { ImageFile, ImageHostingService } from "services/image-hosting-services";
import { FORMATS } from "services/converter/file-formats";
import Converter, { FilePreview } from "services/converter";

import { imgstorNotifications } from "components/notifications";

import styles from "components/uploader/style.module.scss";
import TranscodeLogs from "components/uploader/transcode-logs/script";

function FilesSelecter(): Promise<File> {
    return new Promise((resolve, reject) => {
        const fileSelecter = document.createElement('input');
        fileSelecter.type = "file";
        fileSelecter.accept = "image/*";
        fileSelecter.multiple = true;
        fileSelecter.onchange = () => {
            if (fileSelecter.files === null) {
                return reject(new Error("not select file"));
            }
            const file: File = fileSelecter.files[0];
            resolve(file);
        };
        fileSelecter.onerror = reject;
        fileSelecter.click();
    });
}

interface Props {
    fileConverter: Converter
    hostingService: ImageHostingService
    transcodeLogs: TranscodeLogs
    onchange: (image: ImageFile | undefined) => void
}

const FileSelect: React.FC<Props> = ({ fileConverter, hostingService, transcodeLogs, onchange }) => {
    const { t } = useTranslation();
    const [dragActive, SetDragActive] = useState(false);
    const [selectedFile, SetSelectedFile] = useState<ImageFile>();
    const [previewImage, SetPreviewImage] = useState<FilePreview>();

    useEffect(() => {
        onchange(selectedFile);
    }, [selectedFile]);

    const FileSizeFormat = (bytes: number, decimals: number = 2): string => {
        if (bytes < 0) {
            throw new Error("File size cannot be negative.");
        }

        const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
        if (bytes === 0) return `0 ${sizes[0]}`;

        const k = 1024;
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        const size = parseFloat((bytes / Math.pow(k, i)).toFixed(decimals));

        return `${size} ${sizes[i]}`;
    }

    const SelectFile = async (file: File) => {

        const logPrinter = (msg: string) => transcodeLogs.Println(msg);

        const messages: { [id: string]: Message } = {};

        try {
            const sourceFormat = Converter.InferImageFormat(file);

            if (sourceFormat === undefined) {
                throw new Error("invalid format");
            }

            const animationDetecting = transcodeLogs.Add();
            const animationDetectAbort = new MessageButton("abort");
            const animationDetectMessage = new Message(
                Message.Type.NORMAL,
                "aniation detecting...",
                [animationDetectAbort]
            );

            imgstorNotifications.Append(animationDetectMessage);
            const dynamic = await fileConverter.AnimationDetect(animationDetecting.abortController, file);
            animationDetectMessage.Remove();
            animationDetecting.Remove();

            const image = new ImageFile(file, sourceFormat);

            if (dynamic) {

                if (!hostingService.SupportedDynamicFormats.includes(sourceFormat.name)) {
                    const targetFormatName = hostingService.SupportedDynamicFormats[0];
                    const targetFormat = FORMATS[targetFormatName];

                    const transcode = transcodeLogs.Add();

                    const abort = new MessageButton("abort");
                    abort.on("Clicked", () => transcode.abortController.abort());
                    const message = new Message(
                        Message.Type.NORMAL,
                        "transcoding...",
                        [abort]
                    );
                    imgstorNotifications.Append(message);
                    messages[message.Id] = message;

                    const processesFile = await fileConverter.DynamicConvert(transcode.abortController, file, sourceFormat, targetFormat, logPrinter);
                    transcode.Done();
                    message.Remove();
                    delete messages[message.Id];
                    if (processesFile.size === 0) {
                        throw new Error("fail");
                    }
                    image.SetProcessedFile(processesFile, targetFormat);
                }

            } else {

                if (!hostingService.SupportedStaticFormats.includes(sourceFormat.name)) {
                    const targetFormatName = hostingService.SupportedStaticFormats[0];
                    const targetFormat = FORMATS[targetFormatName];

                    const transcode = transcodeLogs.Add();
                    const abort = new MessageButton("abort");
                    abort.on("Clicked", () => transcode.abortController.abort());
                    const message = new Message(
                        Message.Type.NORMAL,
                        "transcoding...",
                        [abort]
                    );
                    imgstorNotifications.Append(message);
                    messages[message.Id] = message;
                    const processesFile = await fileConverter.StaticConvert(transcode.abortController, file, targetFormat, logPrinter);
                    transcode.Done();
                    message.Remove();
                    delete messages[message.Id];
                    if (processesFile.size === 0) {
                        throw new Error("fail");
                    }
                    image.SetProcessedFile(processesFile, targetFormat);
                }

            }

            {
                const { file, format } = image.Processed || image.Original;

                if (dynamic) {
                    await fileConverter.DynamicPreviewImage(file, format).then(SetPreviewImage);
                } else {
                    const transcode = transcodeLogs.Add();
                    const abort = new MessageButton("abort");
                    abort.on("Clicked", () => transcode.abortController.abort());
                    const message = new Message(
                        Message.Type.NORMAL,
                        "transcoding...",
                        [abort]
                    );
                    messages[message.Id] = message;
                    imgstorNotifications.Append(message);
                    await fileConverter.StaticPreviewImage(transcode.abortController, file, format, logPrinter).then(SetPreviewImage);
                    transcode.Done();
                    message.Remove();
                    delete messages[message.Id];
                }
            }

            SetSelectedFile(image);

            if (image.Processed) {
                const originalSize = FileSizeFormat(image.Original.file.size);
                const processedSize = FileSizeFormat(image.Processed.file.size);

                const confirm = new MessageButton("confirm");

                confirm.on("Clicked", () => {
                    transcodeLogs.Clear();
                });

                const message = new Message(
                    Message.Type.NORMAL,
                    t("uploader_file_converted_size_notification", { originalSize, processedSize }),
                    [confirm]
                );

                imgstorNotifications.Append(message);
            } else if (transcodeLogs.Visibled) {
                transcodeLogs.Clear();
            }

        } catch (err) {
            logPrinter((err as Error).message);
            Object.keys(messages).forEach((id) => {
                messages[id].Remove();
                delete messages[id];
            });

            const confirm = new MessageButton("confirm");
            confirm.on("Clicked", () => {
                transcodeLogs.Clear();
            });
            imgstorNotifications.Append(
                new Message(
                    Message.Type.ALERT,
                    (err as Error).message,
                    [confirm]
                )
            );
        }

    }

    const HandleDrag = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            SetDragActive(true);
        } else if (e.type === 'dragleave') {
            SetDragActive(false);
        }
    }

    const HandleDrop = async (e: React.DragEvent<HTMLDivElement | HTMLImageElement>) => {
        e.preventDefault();
        e.stopPropagation();

        SetDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            SelectFile(e.dataTransfer.files[0]);
        }
    }

    const HandleSelectFile = async () => {
        const file = await FilesSelecter();

        SelectFile(file);
    }

    const HandleOpenPreviewImageInNewTab = async () => {

        if (!previewImage) return;

        const a = document.createElement("a");
        a.target = "_blank";
        a.href = previewImage.url;
        a.click();
    }

    const HandleRemoveImage = () => {
        if (previewImage !== undefined) {
            URL.revokeObjectURL(previewImage.url);
        }
        SetPreviewImage(undefined);
        SetSelectedFile(undefined);
    }

    if (selectedFile === undefined) {

        return <div className={styles.upload_image}
            data-active={dragActive}
            onDragEnter={HandleDrag}
            onDragLeave={HandleDrag}
            onDragOver={HandleDrag}
            onDrop={HandleDrop}
        >
            <p>{t('uploader_drag_file')}</p>
            <button type='button' className={styles.upload_seelct_file} onClick={HandleSelectFile}>{t('uploader_select_file')}</button>
        </div>

    }

    const PreviewVideoLoad = (e: React.UIEvent<HTMLVideoElement>) => {
        const { width, height } = e.currentTarget;
        selectedFile.SetSize(width, height);
    }

    const PreviewImageLoad = (e: React.UIEvent<HTMLImageElement>) => {
        const { width, height } = e.currentTarget;
        selectedFile.SetSize(width, height);
    }

    return <div className={styles.upload_image_selected}>
        {previewImage ?
            <>
                {previewImage.type === FilePreview.TYPE.VIDEO ?
                    <video src={previewImage.url} autoPlay={true} muted={true} loop={true} controls={false} onLoad={PreviewVideoLoad} onClick={HandleOpenPreviewImageInNewTab} /> :
                    <img src={previewImage.url} alt='' onLoad={PreviewImageLoad} onClick={HandleOpenPreviewImageInNewTab} />
                }
            </> :
            <div>{t("uploader_file_preview_not_supported")}</div>
        }
        <button type='button' className={styles.upload_remove} onClick={HandleRemoveImage}>{t('uploader_remove_image')}</button>
    </div>
}

export default FileSelect;