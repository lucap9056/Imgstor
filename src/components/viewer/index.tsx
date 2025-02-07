import React, { useEffect, useId, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { IonIcon } from '@ionic/react';

import { Message, MessageButton } from 'utils/message';
import RoutePaths from 'route-paths';

import Imgstor from "services/imgstor";
import { ImgstorImage, ImgstorTag } from 'services/imgstor-db';
import { ImageFile, ImageHostingService } from 'services/image-hosting-services';
import ImportExternal from 'services/image-hosting-services/import-external';
import { FORMATS } from 'services/converter/file-formats';
import Converter from 'services/converter';

import { imgstorNotifications } from "components/notifications";
import { loadingManager } from "components/loading";
import { imgstorAlerts } from 'components/alerts';

import { TagsSelecterEvent } from 'services/tags-selecter';
import TranscodeLogsComponent from 'components/uploader/transcode-logs';
import TranscodeLogs from 'components/uploader/transcode-logs/script';

import styles from "components/viewer/style.module.scss";
import Title from "components/viewer/title";
import Description from "components/viewer/description";

interface Props {
    imgstor: Imgstor
}

const MainViewer: React.FC<Props> = ({ imgstor }) => {
    const { image_id } = useParams();

    if (!image_id) {
        return <></>;
    }

    const [image, SetImage] = useState<ImgstorImage>(
        imgstor.DB.SearchImages({
            filters: { "id": image_id },
            limit: 1
        })[0]
    );

    if (!image) {
        return <></>;
    }


    const navigate = useNavigate();
    const { t } = useTranslation();
    const component_id = useId();
    const transcodeLogs = new TranscodeLogs();
    const [tags, SetTags] = useState<ImgstorTag[]>((image) ?
        imgstor.DB.GetImageTags(image.id, "id", "name") : []
    );

    const hostingService: ImageHostingService | undefined = (image) ?
        imgstor.AvailableHostingServices[image.hosting_service] :
        undefined;

    useEffect(() => {



        const TagsSelectedHandler = async (e: TagsSelecterEvent<"TagsSelected">) => {
            if (e.deteil.target !== component_id) return;

            SetTags(e.deteil.tags);

            const oldTagMap = new Map(e.deteil.old_tags.map((tag) => [tag.id, tag]));
            const newTagMap = new Map(e.deteil.tags.map((tag) => [tag.id, tag]));

            const appendedTags = e.deteil.tags.filter((tag) => !oldTagMap.has(tag.id));
            const removedTags = e.deteil.old_tags.filter((tag) => !newTagMap.has(tag.id));

            if (appendedTags.length == 0 && removedTags.length == 0) return;

            const loading = loadingManager.Append();
            const saving = new Message(Message.Type.ALERT, t("viewer_image_changed_saving"));
            imgstorNotifications.Append(saving);
            try {
                for (const tag of appendedTags) {
                    imgstor.DB.InsertImageTag(image_id, tag.id);
                }

                for (const tag of removedTags) {
                    imgstor.DB.DeleteImageTag(image_id, tag.id);
                }

                await imgstor.DB.Save();
            }
            catch (err) {
                imgstorNotifications.Append(
                    new Message(
                        Message.Type.ERROR,
                        (err as Error).message
                    )
                );
            }

            saving.Remove();
            loading.Remove();
        }

        imgstor.TagsSelecter.on("TagsSelected", TagsSelectedHandler);
        return () => {
            imgstor.TagsSelecter.off("TagsSelected", TagsSelectedHandler);
        }
    }, []);

    const ImageError = () => {

    }

    const Delete = async () => {
        const loading = loadingManager.Append();

        const removing = new Message(Message.Type.NORMAL, t("viewer_deleting_notification"));
        imgstorNotifications.Append(removing);

        try {
            const hostingService = imgstor.AvailableHostingServices[image.hosting_service];
            if (hostingService && hostingService.NAME !== ImportExternal.NAME) {
                await hostingService.Delete(image);
            }
            if (image.file_id !== "") {
                await imgstor.RemoveImage(image);
            }
            imgstor.DB.DeleteImage(image.id);
            imgstor.DB.Save();
        } catch (err) {

            imgstorAlerts.Append(
                new Message(Message.Type.ERROR, (err as Error).message)
            );

        }
        finally {
            loading.Remove();
            removing.Remove();
        }

    }

    const HandleDelete = () => {

        const cancel = new MessageButton(t("viewer_delete_cancel"));

        const confirm = new MessageButton(t("viewer_delete_confirm"));
        confirm.on("Clicked", async () => {
            await Delete();
            navigate(RoutePaths.HOME);
        });

        imgstorAlerts.Append(
            new Message(
                Message.Type.ALERT,
                t("viewer_delete_alert"),
                [cancel, confirm]
            )
        );

    }

    const HandleOpen = () => {
        if (!image) return;

        const a = document.createElement("a");
        a.href = image.link;
        a.target = "_blank";
        a.click();
    }

    const HandleCopyLink = () => {
        if (!image) return;
        navigator.clipboard.writeText(image.link);
        const copiedMessage = new Message(
            Message.Type.NORMAL,
            t("viewer_copy_link_notification")
        );
        imgstorNotifications.Append(
            copiedMessage
        );
    }

    const HandleDownload = async () => {
        if (!image) return;

        if (image.file_id === "") {
            imgstorNotifications.Append(
                new Message(Message.Type.NORMAL,
                    t("viewer_file_not_stored"))
            );
            return;
        }

        const loading = loadingManager.Append();
        const downloading = new Message(
            Message.Type.ALERT,
            t("viewer_downloading")
        );
        try {
            const file = await imgstor.DownloadImage(image);
            const a = document.createElement("a");
            a.href = URL.createObjectURL(file);
            a.download = image.name;
            a.target = "_blank";
            a.click();
            URL.revokeObjectURL(a.href);
        }
        catch (err) {
            imgstorNotifications.Append(
                new Message(Message.Type.ERROR,
                    t("viewer_file_download_fail")
                )
            );
        }
        loading.Remove();
        downloading.Remove();
    }

    const FileConvert = (file: File): Promise<ImageFile> => {

        return new Promise(async (resolve, reject) => {

            if (!hostingService) {
                return reject(new Error());
            }

            const fileConverter = imgstor.FileConverter;
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

                const imageFile = new ImageFile(file, sourceFormat);

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
                        imageFile.SetProcessedFile(processesFile, targetFormat);
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
                        imageFile.SetProcessedFile(processesFile, targetFormat);
                    }

                }

                if (imageFile.Processed) {
                    const originalSize = Converter.FileSizeFormat(imageFile.Original.file.size);
                    const processedSize = Converter.FileSizeFormat(imageFile.Processed.file.size);

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

                resolve(imageFile);

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

                reject(err);
            }
        });


    }

    const HandleReupload = () => {
        if (!image) return;

        if (hostingService === undefined || !hostingService.enabled) {
            return;
        }

        if (image.file_id === "") {
            imgstorNotifications.Append(
                new Message(Message.Type.NORMAL,
                    t("viewer_file_not_stored"))
            );
            return;
        }

        const confirm = new MessageButton(t("viewer_reupload_confirm"));
        confirm.on("Clicked", async () => {

            if (!hostingService) {
                return;
            }

            try {

                const [file] = await Promise.all([
                    imgstor.DownloadImage(image),
                    hostingService.Delete(image)
                ]);

                const convertedFile = await FileConvert(file);

                convertedFile.Title = image.title;
                convertedFile.Description = image.description;

                const uploadedImage = await hostingService.Upload(true, convertedFile);


                Object.assign(uploadedImage, {
                    id: image.id,
                    file_id: image.file_id
                });

                imgstor.DB.UpdateImage(uploadedImage);
                await imgstor.DB.Save();

                SetImage(uploadedImage);
            }
            catch (err) {
                imgstorAlerts.Append(
                    new Message(
                        Message.Type.ERROR,
                        (err as Error).message
                    )
                );
            }

        });


        /**
         * 
         */

        imgstorAlerts.Append(
            new Message(
                Message.Type.ALERT,
                t("viewer_reupload_alert"),
                [
                    new MessageButton(t("viewer_reupload_cancel")),
                    confirm
                ]
            )
        );

    }

    const HandleBack = () => {
        navigate(RoutePaths.HOME);
    }

    const HandleSelectTags = () => {
        imgstor.TagsSelecter.Request(component_id, tags);
    }

    return <div className={styles.viewer_container}>
        <div className={styles.viewer}>
            <div className={styles.viewer_main}>

                <Title imgstorDB={imgstor.DB} image={image} />

                <div className={styles.viewer_image}>
                    <img alt='' onError={ImageError} src={image.link} />
                </div>

                <Description imgstorDB={imgstor.DB} image={image} />

                <div className={styles.viewer_image_tags} data-text={t("viewer_image_tags")} onClick={HandleSelectTags}>
                    {tags.map(
                        (tag) => <div
                            className={styles.viewer_image_tag}
                            key={tag.id}
                        >
                            {tag.name}
                        </div>
                    )}
                </div>

            </div>


            <div className={styles.viewer_options}>
                <li className={styles.viewer_option} onClick={HandleDelete} data-text={t("viewer_delete")}>
                    <IonIcon icon="trash" />
                </li>
                <li className={styles.viewer_option} onClick={HandleOpen} data-text={t("viewer_open")}>
                    <IonIcon icon="open" />
                </li>
                <li className={styles.viewer_option} onClick={HandleCopyLink} data-text={t("viewer_copy_link")}>
                    <IonIcon icon="clipboard" />
                </li>

                {image.file_id !== "" ? <>
                    <li className={styles.viewer_option} onClick={HandleDownload} data-text={t("viewer_download")}>
                        <IonIcon icon="cloud-download" />
                    </li>

                    {hostingService !== undefined && hostingService.enabled ?
                        <li className={styles.viewer_option} onClick={HandleReupload} data-text={t("viewer_reupload")}>
                            <IonIcon icon="cloud-upload" />
                        </li> : null
                    }

                </> : null}

                <li className={styles.viewer_option} onClick={HandleBack} data-text={t("viewer_back")}>
                    <IonIcon icon="return-down-back" />
                </li>
            </div>


        </div>
        <TranscodeLogsComponent transcodeLogs={transcodeLogs} />
    </div>;
}

export default MainViewer;