import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { useNotifications } from "global-components/notifications";
import { useAlerts } from "global-components/alerts";

import { ImageFile, ImageHostingService } from "services/image-hosting-services";
import Converter from "services/converter";

import ConvertFile from "components/uploader/file-select/convert";
import { ConvertedFile } from "components/uploader/file-select/convert/ctx";

import styles from "components/uploader/style.module.scss";
import TranscodeLogs from "components/uploader/transcode-logs";
import { Message, MessageButton } from "structs/message";

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
    const notifications = useNotifications();
    const alerts = useAlerts();
    const translation = useTranslation();
    const { t } = translation;
    const [dragActive, SetDragActive] = useState(false);
    const [selectedFile, SetSelectedFile] = useState<ConvertedFile>();
    const [previewImageUrl, SetPreviewImageUrl] = useState<string>();

    useEffect(() => {
        if (previewImageUrl) {
            URL.revokeObjectURL(previewImageUrl);
        }
        if (selectedFile) {

            onchange(selectedFile.imageFile);

            const { preview } = selectedFile.imageFile;

            if (preview) {
                const url = URL.createObjectURL(preview.file);
                SetPreviewImageUrl(url);
            }

        }
    }, [selectedFile]);

    const HandleDrag = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            SetDragActive(true);
        } else if (e.type === 'dragleave') {
            SetDragActive(false);
        }
    }

    const SelectFile = (file: File) => {

        const messages = new Map();

        ConvertFile({
            translation,
            notifications,
            alerts,
            fileConverter,
            hostingService,
            transcodeLogs,
            file,
            messages,
        })
            .then(SetSelectedFile)
            .catch((err: Error) => {
                transcodeLogs.println(`An error occurred during file selection and processing: ${err.message}`);


                for (const message of messages.values()) {
                    message.Remove();
                    messages.delete(message.id);
                }

                const confirmButton = new MessageButton(t("main.confirm"));
                confirmButton.on("Clicked", () => {
                    transcodeLogs.clear();
                });

                notifications.append(
                    new Message({
                        type: Message.Type.ALERT,
                        content: t("uploader.file.error.processing", { message: err.message }),
                        buttons: [confirmButton]
                    })
                );
            });

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

    const HandleRemoveImage = () => {
        if (previewImageUrl !== undefined) {
            URL.revokeObjectURL(previewImageUrl);
        }
        SetPreviewImageUrl(undefined);
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
            <p>{t('uploader.file.drag')}</p>
            <button type='button' className={styles.upload_seelct_file} onClick={HandleSelectFile}>{t('uploader.file.select')}</button>
        </div>

    }

    const PreviewImageLoad = (e: React.UIEvent<HTMLImageElement>) => {
        const { width, height } = e.currentTarget;
        selectedFile.imageFile.SetImageSize(width, height);
    }

    return <div className={styles.upload_image_selected}>
        {previewImageUrl ?
            <img src={previewImageUrl} alt='' onLoad={PreviewImageLoad} />
            :
            <div>{t("uploader.file.preview.not-supported")}</div>
        }
        <button type='button' className={styles.upload_remove} onClick={HandleRemoveImage}>{t('uploader.file.remove')}</button>
    </div>
}

export default FileSelect;