import React, { useCallback, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowUpRightFromSquare, faCopy, faDownload, faTrashCan, faUpload } from "@fortawesome/free-solid-svg-icons";

import { Message, MessageButton } from 'structs/message';
import RoutePaths from 'route-paths';

import { useImgstor } from "services/imgstor";
import { ImgstorImage } from 'services/imgstor-db';
import { ImageFile, ImageHostingService } from 'services/image-hosting-services';
import ImportExternal from 'services/image-hosting-services/import-external';
import { FORMATS } from 'services/converter/file-formats';
import Converter from 'services/converter';

import { useNotifications } from 'global-components/notifications';
import { useAlerts } from 'global-components/alerts';
import { useLoader } from 'global-components/loader';

import TranscodeLogs from 'components/uploader/transcode-logs';

import Options, { Option } from './options';
import Header from "./header";
import Image from './image';
import Description from "./description";
import Tags from './tags';

import styles from "./style.module.scss";

const MainViewer: React.FC = () => {
    const notifications = useNotifications();
    const loader = useLoader();
    const alerts = useAlerts();
    const imgstor = useImgstor();
    const { imageId } = useParams();

    if (!imageId) {
        return <></>;
    }

    const [image, SetImage] = useState<ImgstorImage>(
        imgstor.db.SearchImages({
            filters: { imageId },
            limit: 1
        })[0]
    );

    if (!image) {
        return <></>;
    }


    const navigate = useNavigate();
    const { t } = useTranslation();
    const transcodeLogs = new TranscodeLogs();

    const hostingService: ImageHostingService | undefined = (image) ?
        imgstor.availableHostingServices[image.hostingServiceId] :
        undefined;

    const Delete = async () => {
        const loading = loader.append();

        const removing = notifications.append(
            new Message({
                type: Message.Type.NORMAL,
                content: t("viewer.notifiaction.deleting")
            })
        );

        try {
            const hostingService = imgstor.availableHostingServices[image.hostingServiceId];
            if (hostingService && hostingService.NAME !== ImportExternal.NAME) {
                hostingService.Delete(image);
            }

            if (image.fileId !== "") {
                await imgstor.removeImage(image);
            }
            imgstor.db.DeleteImage(image.imageId);

            await imgstor.db.Save();

        } catch (err) {

            alerts.append(
                new Message({
                    type: Message.Type.ERROR,
                    content: (err as Error).message
                })
            );

        }
        finally {
            loading.remove();
            removing.remove();
        }

    }

    const HandleDelete = () => {

        const cancel = new MessageButton(t("main.cancel"));

        const confirm = new MessageButton(t("main.confirm"));
        confirm.on("Clicked", async () => {
            await Delete();
            navigate(RoutePaths.HOME);
        });

        alerts.append(
            new Message({
                type: Message.Type.ALERT,
                content: t("viewer.alert.delete"),
                buttons: [cancel, confirm]
            })
        );

    }

    const HandleOpen = useCallback(() => {
        if (!image) return;

        const a = document.createElement("a");
        a.href = image.imageUrl;
        a.target = "_blank";
        a.click();
    }, [image]);

    const HandleCopyLink = useCallback(() => {
        if (!image) return;
        navigator.clipboard.writeText(image.imageUrl);

        notifications.append(
            new Message({
                type: Message.Type.NORMAL,
                content: t("viewer.notification.link-copied")
            })
        );
    }, [image]);

    const HandleDownload = useCallback(async () => {
        if (!image) return;

        if (image.fileId === "") {
            notifications.append(
                new Message({
                    type: Message.Type.NORMAL,
                    content: t("viewer.notification.not-stored")
                })
            );
            return;
        }

        const loading = loader.append();
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
            notifications.append(
                new Message({
                    type: Message.Type.ERROR,
                    content: t("viewer.notification.download-failed")
                })
            );
        }
        loading.remove();
        downloading.remove();
    }, [image]);

    const FileConvert = (file: File): Promise<ImageFile> => {

        return new Promise(async (resolve, reject) => {

            if (!hostingService) {
                return reject(new Error());
            }

            const fileConverter = imgstor.converter;
            const LogMessage = (msg: string) => transcodeLogs.println(msg);

            const messages: { [id: string]: Message } = {};

            try {
                const sourceFormat = Converter.InferFileFormat(file);

                if (sourceFormat === undefined) {
                    throw new Error("invalid format");
                }

                const animationDetecting = transcodeLogs.add();
                const animationDetectAbort = new MessageButton(t("main.abort"));
                const animationDetectMessage = notifications.append(
                    new Message({
                        type: Message.Type.NORMAL,
                        content: t("uploader.file.notifiaction.aniation-detecting"),
                        buttons: [animationDetectAbort]
                    })
                );

                const dynamic = await fileConverter.DetectAnimation(animationDetecting.abortController, file, LogMessage);
                animationDetectMessage.remove();
                animationDetecting.remove();

                const imageFile = new ImageFile(file, sourceFormat);

                if (dynamic) {

                    if (!hostingService.SupportedAnimationFormats.includes(sourceFormat.name)) {
                        const targetFormatName = hostingService.SupportedAnimationFormats[0];
                        const targetFormat = FORMATS[targetFormatName];

                        const transcode = transcodeLogs.add();

                        const abort = new MessageButton("abort");
                        abort.on("Clicked", () => transcode.abortController.abort());
                        const message = notifications.append(
                            new Message({
                                type: Message.Type.NORMAL,
                                content: t("uploader.file.notifiaction.transcoding"),
                                buttons: [abort]
                            })
                        );

                        messages[message.id] = message;

                        const { converted, firstFrame } = await fileConverter.ConvertAnimatedImage(transcode.abortController, file, sourceFormat, targetFormat, true, LogMessage);
                        transcode.done();
                        message.remove();
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

                        const transcode = transcodeLogs.add();
                        const abort = new MessageButton(t("main.abort"));
                        abort.on("Clicked", () => transcode.abortController.abort());
                        const message = notifications.append(
                            new Message({
                                type: Message.Type.NORMAL,
                                content: t("uploader.file.notifiaction.transcoding"),
                                buttons: [abort]
                            })
                        );

                        messages[message.id] = message;
                        const processesFile = await fileConverter.ConvertStaticImage(transcode.abortController, file, targetFormat, LogMessage);
                        transcode.done();
                        message.remove();
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
                        transcodeLogs.clear();
                    });

                    notifications.append(
                        new Message({
                            type: Message.Type.NORMAL,
                            content: t("uploader.file.notifiaction.converted-size", { originalSize, processedSize }),
                            buttons: [confirm]
                        })
                    );
                } else if (transcodeLogs.visibled) {
                    transcodeLogs.clear();
                }

                resolve(imageFile);

            } catch (err) {
                LogMessage((err as Error).message);
                Object.keys(messages).forEach((id) => {
                    messages[id].remove();
                    delete messages[id];
                });

                const confirm = new MessageButton(t("main.confirm"));
                confirm.on("Clicked", () => {
                    transcodeLogs.clear();
                });
                notifications.append(
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

    const HandleReupload = useCallback(() => {
        if (!image) return;

        if (hostingService === undefined || !hostingService.isEnabled) {
            return;
        }

        if (image.fileId === "") {
            notifications.append(
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

                imgstor.db.UpdateImage({
                    ...uploadedImage,
                    imageId: image.imageId,
                    fileId: image.fileId
                });
                await imgstor.db.Save();

                SetImage(uploadedImage);
            }
            catch (err) {
                alerts.append(
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

        alerts.append(
            new Message({
                type: Message.Type.ALERT,
                content: t("viewer.alert.reupload"),
                buttons: [
                    new MessageButton(t("main.cancel")),
                    confirm
                ]
            })
        );

    }, [image]);

    const options: Option[] = [
        {
            key: "delete",
            text: t("viewer.option.delete"),
            node: <FontAwesomeIcon icon={faTrashCan} />,
            handler: HandleDelete
        },
        {
            key: "open",
            text: t("viewer.option.open"),
            node: <FontAwesomeIcon icon={faArrowUpRightFromSquare} />,
            handler: HandleOpen
        },
        {
            key: "copy-link",
            text: t("viewer.option.copy-link"),
            node: <FontAwesomeIcon icon={faCopy} />,
            handler: HandleCopyLink
        }
    ]

    if (image.fileId !== "") {
        options.push({
            key: "download",
            text: t("viewer.option.download"),
            node: <FontAwesomeIcon icon={faDownload} />,
            handler: HandleDownload
        })

        if (hostingService !== undefined && hostingService.isEnabled) {
            options.push({
                key: "reupload",
                text: t("viewer.option.reupload"),
                node: <FontAwesomeIcon icon={faUpload} />,
                handler: HandleReupload
            })
        }

    }

    return <div className={styles.viewer}>
        <Header image={image} />
        <Image image={image} />
        <Options options={options} />
        <Description image={image} />
        <Tags image={image} />
        <TranscodeLogs.Component transcodeLogs={transcodeLogs} />

    </div>;
}

export default MainViewer;