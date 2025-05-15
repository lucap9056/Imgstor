import React, { useEffect, useId, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { Message, MessageButton } from 'structs/message';
import RoutePaths from 'route-paths';

import { useImgstor } from "services/imgstor";
import { ImgstorImage, ImgstorTag } from 'services/imgstor-db';
import { ImageFile, ImageHostingService } from 'services/image-hosting-services';
import ImportExternal from 'services/image-hosting-services/import-external';
import { FORMATS } from 'services/converter/file-formats';
import Converter from 'services/converter';

import { useNotifications } from "components/notifications";
import { useLoadingState } from "components/loading";
import { useAlerts } from 'components/alerts';

import { TagsSelecterEvent } from 'services/tags-selecter';
import TranscodeLogs from 'components/uploader/transcode-logs';

import styles from "components/viewer/style.module.scss";
import Title from "components/viewer/title";
import Description from "components/viewer/description";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUpRightFromSquare, faCloudUpload, faCopy, faDownload, faLeftLong, faTrash } from '@fortawesome/free-solid-svg-icons';

const MainViewer: React.FC = () => {
    const notifications = useNotifications();
    const loadingState = useLoadingState();
    const alerts = useAlerts();
    const imgstor = useImgstor();
    const { imageId } = useParams();

    if (!imageId) {
        return <></>;
    }

    const [image, SetImage] = useState<ImgstorImage>(
        imgstor.DB.SearchImages({
            filters: { imageId },
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
    const [loaded, SetLoaded] = useState(false);
    const [aspectRatio, SetAspectRatio] = useState(`${image.width}/${image.height}`);
    const [tags, SetTags] = useState<ImgstorTag[]>((image) ?
        imgstor.DB.GetImageTags(image.imageId, "tagId", "name") : []
    );

    const hostingService: ImageHostingService | undefined = (image) ?
        imgstor.AvailableHostingServices[image.hostingServiceId] :
        undefined;

    useEffect(() => {

        const TagsSelectedHandler = async (e: TagsSelecterEvent<"TagsSelected">) => {
            if (e.deteil.target !== component_id) return;

            SetTags(e.deteil.tags);

            const oldTagMap = new Map(e.deteil.old_tags.map((tag) => [tag.tagId, tag]));
            const newTagMap = new Map(e.deteil.tags.map((tag) => [tag.tagId, tag]));

            const appendedTags = e.deteil.tags.filter((tag) => !oldTagMap.has(tag.tagId));
            const removedTags = e.deteil.old_tags.filter((tag) => !newTagMap.has(tag.tagId));

            if (appendedTags.length == 0 && removedTags.length == 0) return;

            const loading = loadingState.Append();
            const saving = notifications.Append(
                new Message({
                    type: Message.Type.ALERT,
                    content: t("main.saving")
                })
            );

            try {
                for (const tag of appendedTags) {
                    imgstor.DB.InsertImageTag(imageId, tag.tagId);
                }

                for (const tag of removedTags) {
                    imgstor.DB.DeleteImageTag(imageId, tag.tagId);
                }

                await imgstor.DB.Save();
            }
            catch (err) {
                notifications.Append(
                    new Message({
                        type: Message.Type.ERROR,
                        content: (err as Error).message
                    })
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

    const ImageLoadHandler = (e: React.UIEvent<HTMLImageElement>) => {
        const { width, height } = e.currentTarget;

        SetAspectRatio(`${width}/${height}`);
        SetLoaded(true);
    }

    const ImageError = () => {

    }

    const Delete = async () => {
        const loading = loadingState.Append();

        const removing = notifications.Append(
            new Message({
                type: Message.Type.NORMAL,
                content: t("viewer.notifiaction.deleting")
            })
        );

        try {
            const hostingService = imgstor.AvailableHostingServices[image.hostingServiceId];
            if (hostingService && hostingService.NAME !== ImportExternal.NAME) {
                hostingService.Delete(image);
            }

            if (image.fileId !== "") {
                await imgstor.RemoveImage(image);
            }
            imgstor.DB.DeleteImage(image.imageId);

            await imgstor.DB.Save();

        } catch (err) {

            alerts.Append(
                new Message({
                    type: Message.Type.ERROR,
                    content: (err as Error).message
                })
            );

        }
        finally {
            loading.Remove();
            removing.Remove();
        }

    }

    const HandleDelete = () => {

        const cancel = new MessageButton(t("main.cancel"));

        const confirm = new MessageButton(t("main.confirm"));
        confirm.on("Clicked", async () => {
            await Delete();
            navigate(RoutePaths.HOME);
        });

        alerts.Append(
            new Message({
                type: Message.Type.ALERT,
                content: t("viewer.alert.delete"),
                buttons: [cancel, confirm]
            })
        );

    }

    const HandleOpen = () => {
        if (!image) return;

        const a = document.createElement("a");
        a.href = image.imageUrl;
        a.target = "_blank";
        a.click();
    }

    const HandleCopyLink = () => {
        if (!image) return;
        navigator.clipboard.writeText(image.imageUrl);
        const copiedMessage = new Message({
            type: Message.Type.NORMAL,
            content: t("viewer.notification.link-copied")
        });
        notifications.Append(
            copiedMessage
        );
    }

    const HandleDownload = async () => {
        if (!image) return;

        if (image.fileId === "") {
            notifications.Append(
                new Message({
                    type: Message.Type.NORMAL,
                    content: t("viewer.notification.not-stored")
                })
            );
            return;
        }

        const loading = loadingState.Append();
        const downloading = new Message({
            type: Message.Type.ALERT,
            content: t("viewer.alert.downloading")
        });
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
            notifications.Append(
                new Message({
                    type: Message.Type.ERROR,
                    content: t("viewer.notification.download-failed")
                })
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
            const LogMessage = (msg: string) => transcodeLogs.Println(msg);

            const messages: { [id: string]: Message } = {};

            try {
                const sourceFormat = Converter.InferFileFormat(file);

                if (sourceFormat === undefined) {
                    throw new Error("invalid format");
                }

                const animationDetecting = transcodeLogs.Add();
                const animationDetectAbort = new MessageButton(t("main.abort"));
                const animationDetectMessage = notifications.Append(
                    new Message({
                        type: Message.Type.NORMAL,
                        content: t("uploader.file.notifiaction.aniation-detecting"),
                        buttons: [animationDetectAbort]
                    })
                );

                const dynamic = await fileConverter.DetectAnimation(animationDetecting.abortController, file, LogMessage);
                animationDetectMessage.Remove();
                animationDetecting.Remove();

                const imageFile = new ImageFile(file, sourceFormat);

                if (dynamic) {

                    if (!hostingService.SupportedAnimationFormats.includes(sourceFormat.name)) {
                        const targetFormatName = hostingService.SupportedAnimationFormats[0];
                        const targetFormat = FORMATS[targetFormatName];

                        const transcode = transcodeLogs.Add();

                        const abort = new MessageButton("abort");
                        abort.on("Clicked", () => transcode.abortController.abort());
                        const message = notifications.Append(
                            new Message({
                                type: Message.Type.NORMAL,
                                content: t("uploader.file.notifiaction.transcoding"),
                                buttons: [abort]
                            })
                        );

                        messages[message.id] = message;

                        const { converted, firstFrame } = await fileConverter.ConvertAnimatedImage(transcode.abortController, file, sourceFormat, targetFormat, true, LogMessage);
                        transcode.Done();
                        message.Remove();
                        delete messages[message.id];
                        if (converted.file.size === 0) {
                            throw new Error("fail");
                        }

                        imageFile.SetProcessedFile(converted.file, converted.fileFormat);

                        if (firstFrame) {
                            imageFile.SetPreviewFile(firstFrame.file, firstFrame.fileFormat);
                        }
                    }

                } else {

                    if (!hostingService.SupportedStaticFormats.includes(sourceFormat.name)) {
                        const targetFormatName = hostingService.SupportedStaticFormats[0];
                        const targetFormat = FORMATS[targetFormatName];

                        const transcode = transcodeLogs.Add();
                        const abort = new MessageButton(t("main.abort"));
                        abort.on("Clicked", () => transcode.abortController.abort());
                        const message = notifications.Append(
                            new Message({
                                type: Message.Type.NORMAL,
                                content: t("uploader.file.notifiaction.transcoding"),
                                buttons: [abort]
                            })
                        );

                        messages[message.id] = message;
                        const processesFile = await fileConverter.ConvertStaticImage(transcode.abortController, file, targetFormat, LogMessage);
                        transcode.Done();
                        message.Remove();
                        delete messages[message.id];
                        if (processesFile.size === 0) {
                            throw new Error("fail");
                        }
                        imageFile.SetProcessedFile(processesFile, targetFormat);
                    }

                }

                if (imageFile.processed) {
                    const originalSize = Converter.InferFileFormat(imageFile.original.file);
                    const processedSize = Converter.InferFileFormat(imageFile.processed.file);

                    const confirm = new MessageButton(t("main.confirm"));

                    confirm.on("Clicked", () => {
                        transcodeLogs.Clear();
                    });

                    notifications.Append(
                        new Message({
                            type: Message.Type.NORMAL,
                            content: t("uploader.file.notifiaction.converted-size", { originalSize, processedSize }),
                            buttons: [confirm]
                        })
                    );
                } else if (transcodeLogs.Visibled) {
                    transcodeLogs.Clear();
                }

                resolve(imageFile);

            } catch (err) {
                LogMessage((err as Error).message);
                Object.keys(messages).forEach((id) => {
                    messages[id].Remove();
                    delete messages[id];
                });

                const confirm = new MessageButton(t("main.confirm"));
                confirm.on("Clicked", () => {
                    transcodeLogs.Clear();
                });
                notifications.Append(
                    new Message({
                        type: Message.Type.ALERT,
                        content: (err as Error).message,
                        buttons: [confirm]
                    })
                );

                reject(err);
            }
        });


    }

    const HandleReupload = () => {
        if (!image) return;

        if (hostingService === undefined || !hostingService.isEnabled) {
            return;
        }

        if (image.fileId === "") {
            notifications.Append(
                new Message({
                    type: Message.Type.NORMAL,
                    content: t("viewer.notification.not-stored")
                })
            );
            return;
        }

        const confirm = new MessageButton(t("main.confirm"));
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

                convertedFile.title = image.title;
                convertedFile.description = image.description;

                const uploadedImage = await hostingService.Upload(true, convertedFile);

                imgstor.DB.UpdateImage({
                    ...uploadedImage,
                    imageId: image.imageId,
                    fileId: image.fileId
                });
                await imgstor.DB.Save();

                SetImage(uploadedImage);
            }
            catch (err) {
                alerts.Append(
                    new Message({
                        type: Message.Type.ERROR,
                        content: (err as Error).message
                    })
                );
            }

        });


        /**
         * 
         */

        alerts.Append(
            new Message({
                type: Message.Type.ALERT,
                content: t("viewer.alert.reupload"),
                buttons: [
                    new MessageButton(t("main.cancel")),
                    confirm
                ]
            })
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

                <Title image={image} />

                <div className={styles.viewer_image} style={{ aspectRatio }} data-loaded={loaded}>
                    <img alt='' onError={ImageError} onLoad={ImageLoadHandler} src={image.imageUrl} />
                </div>

                <Description image={image} />

                <div className={styles.viewer_image_tags} data-text={t("viewer.label.tags")} onClick={HandleSelectTags}>
                    {tags.map(
                        (tag) => <div
                            className={styles.viewer_image_tag}
                            key={tag.tagId}
                        >
                            {tag.name}
                        </div>
                    )}
                </div>

            </div>


            <div className={styles.viewer_options}>
                <li className={styles.viewer_option} onClick={HandleDelete} data-text={t("viewer.option.delete")}>
                    <FontAwesomeIcon icon={faTrash} />
                </li>
                <li className={styles.viewer_option} onClick={HandleOpen} data-text={t("viewer.option.open")}>
                    <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
                </li>
                <li className={styles.viewer_option} onClick={HandleCopyLink} data-text={t("viewer.option.copy-link")}>
                    <FontAwesomeIcon icon={faCopy} />
                </li>

                {image.fileId !== "" ? <>
                    <li className={styles.viewer_option} onClick={HandleDownload} data-text={t("viewer.option.download")}>
                        <FontAwesomeIcon icon={faDownload} />
                    </li>

                    {hostingService !== undefined && hostingService.isEnabled ?
                        <li className={styles.viewer_option} onClick={HandleReupload} data-text={t("viewer.option.reupload")}>
                            <FontAwesomeIcon icon={faCloudUpload} />
                        </li> : null
                    }

                </> : null}

                <li className={styles.viewer_option} onClick={HandleBack} data-text={t("viewer.option.back")}>
                    <FontAwesomeIcon icon={faLeftLong} />
                </li>
            </div>


        </div>
        <TranscodeLogs.Component transcodeLogs={transcodeLogs} />
    </div>;
}

export default MainViewer;