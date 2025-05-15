import React, { useId, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { Message, MessageButton } from 'structs/message';

import { useImgstor } from 'services/imgstor';
import { ImgstorTag } from "services/imgstor-db";
import { ImageFile, ImageHostingService } from 'services/image-hosting-services';
import ImportExternal from 'services/image-hosting-services/import-external';
import Local from 'services/image-hosting-services/local';

import { useNotifications } from 'components/notifications';
import { useLoadingState } from 'components/loading';
import { useAlerts } from 'components/alerts';
import ImportExternalComponent from "components/uploader/import-external";
import TranscodeLogs from "components/uploader/transcode-logs";
import FileSelect from "components/uploader/file-select";
import TagsSelect from 'components/uploader/tags-select';
import HostingServiceSelect from 'components/uploader/hosting-service-select';

import styles from "components/uploader/style.module.scss";
import index_styles from "@/index.module.scss";
import RoutePaths from 'route-paths';

const Uploader: React.FC = () => {
    const notifications = useNotifications();
    const loadingState = useLoadingState();
    const alerts = useAlerts();
    const { t } = useTranslation();
    const imgstor = useImgstor();
    const [selectedFile, SetSelectedFile] = useState<ImageFile>();
    const [selectedTags, SetSelectedTags] = useState<ImgstorTag[]>([]);
    const [transcodeLogs] = useState<TranscodeLogs>(new TranscodeLogs());
    const [imageHostingService, SetImageHostingService] = useState<ImageHostingService>();
    const [save, SetSave] = useState(true);
    const navigate = useNavigate();

    const FOR_ID = {
        TITLE: useId(),
        DESCRIPTION: useId()
    }

    const LocalUploadImage = (file: ImageFile) => {
        const a = document.createElement('a');
        const f = (file.processed || file.original).file;
        a.href = URL.createObjectURL(f);
        a.download = f.name;
        a.click();
        URL.revokeObjectURL(a.href);
    }

    const ImportExternalImage = async (hostingService: ImageHostingService, file: ImageFile) => {
        const image = await hostingService.Upload(save, file);
        const imageId = imgstor.DB.InsertImage(image);
        for (const { tagId } of selectedTags) {
            imgstor.DB.InsertImageTag(imageId, tagId);
        }

        const saving = new Message({
            type: Message.Type.NORMAL,
            content: t("uploader.notification.saving")
        });
        notifications.Append(saving);
        try {
            await imgstor.DB.Save();
        }
        catch (err) {
            notifications.Append(
                new Message({
                    type: Message.Type.ERROR,
                    content: t("uploader.notification.save-failed")
                })
            );
        }
        saving.Remove();

        const confirm = new MessageButton(t("main.confirm"));
        confirm.on("Clicked", () => {
            navigate(RoutePaths.HOME);
        });

        alerts.Append(
            new Message({
                type: Message.Type.ALERT,
                content: t("uploader.notification.uploaded"),
                buttons: [confirm]
            })
        );

    }

    const DefaultUploadImage = async (hostingService: ImageHostingService, file: ImageFile) => {

        const image = await hostingService.Upload(save, file);

        if (save) {
            const imageId = await imgstor.AppendImage(image, file.original.file)
                .then((img) => imgstor.DB.InsertImage(img));

            for (const { tagId } of selectedTags) {
                imgstor.DB.InsertImageTag(imageId, tagId);
            }

            try {
                await imgstor.DB.Save();
            }
            catch (err) {
                notifications.Append(
                    new Message({
                        type: Message.Type.ERROR,
                        content: t("uploader.notification.save-failed")
                    })
                );
            }

            const copyLinkButton = new MessageButton(
                t("uploader.copy-link"),
                { auto_remove: false }
            );
            copyLinkButton.on("Clicked", () => {
                navigator.clipboard.writeText(image.imageUrl);

                notifications.Append(
                    new Message({
                        type: Message.Type.NORMAL,
                        content: t("uploader.notification.link-copied")
                    })
                );
            });


            const confirmButton = new MessageButton(t("main.confirm"));
            confirmButton.on("Clicked", () => {
                navigate(RoutePaths.HOME);
            });

            alerts.Append(
                new Message({
                    type: Message.Type.ALERT,
                    content: t("uploader.notification.uploaded"),
                    buttons: [copyLinkButton, confirmButton]
                })
            );

        } else {
            const deleteButton = new MessageButton("main.delete");
            deleteButton.on("Clicked", () => {
                hostingService.Delete(image);
                navigate(RoutePaths.HOME);
            });

            const copyLinkButton = new MessageButton(
                t("uploader.copy-link"),
                { auto_remove: false }
            );

            copyLinkButton.on("Clicked", () => {
                navigator.clipboard.writeText(image.imageUrl);

                notifications.Append(
                    new Message({
                        type: Message.Type.NORMAL,
                        content: t("uploader.notification.link-copied")
                    })
                );
            });

            const confirmButton = new MessageButton(t("main.confirm"));
            confirmButton.on("Clicked", () => {
                navigate(RoutePaths.HOME);
            });

            alerts.Append(
                new Message({
                    type: Message.Type.ALERT,
                    content: t("uploader.notification.uploaded"),
                    buttons: [deleteButton, copyLinkButton, confirmButton]
                })
            );
        }

    }

    const ConfirmUploadImage = async (form: FormData, file: ImageFile) => {
        if (!imageHostingService) {
            return;
        }


        const loading = loadingState.Append();

        const notification = new Message({
            type: Message.Type.NORMAL,
            content: t("uploader.notification.uploading")
        })
        notifications.Append(notification);


        file.title = (form.get("title") || "").toString();
        file.description = (form.get("description") || "").toString();

        try {
            switch (imageHostingService.NAME) {
                case Local.NAME: {
                    LocalUploadImage(file);
                    break;
                }
                case ImportExternal.NAME: {
                    await ImportExternalImage(imageHostingService, file);
                    break;
                }

                default:
                    await DefaultUploadImage(imageHostingService, file);
                    break;
            }
        }
        catch (err) {
            console.error(err);
            notifications.Append(
                new Message({
                    type: Message.Type.ERROR,
                    content: (err as Error).message
                })
            );
        }

        loading.Remove();
        notification.Remove();

    }

    const HandleUpload = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (!selectedFile) return;

        const file = selectedFile.original.file;

        if (!file) return;

        const form = new FormData(e.target as HTMLFormElement);

        const cancel = new MessageButton(t("main.cancel"));

        const confirm = new MessageButton(t("main.confirm"));
        confirm.on("Clicked", () => {
            ConfirmUploadImage(form, selectedFile);
        })

        alerts.Append(
            new Message({
                type: Message.Type.NORMAL,
                content: t("uploader.alert.upload"),
                buttons: [cancel, confirm]
            }
            )
        );
    }

    const HandleCancel = () => {
        SetSelectedFile(undefined);
        navigate(RoutePaths.HOME);
    }

    const HandleSelectImage = (file?: ImageFile) => {
        SetSelectedFile(file);
    }

    const HandleSelectTags = (tags: ImgstorTag[]) => {
        SetSelectedTags(tags);
    }

    const HandleSetSave = () => {
        SetSave(!save);
    }

    return <>
        <div className={styles.uploader_container}>
            <form className={styles.uploader} onReset={HandleCancel} onSubmit={HandleUpload} >
                <HostingServiceSelect imgstor={imgstor} onchange={SetImageHostingService} />

                {imageHostingService && <>

                    {
                        imageHostingService.features.description &&
                        <>
                            <label htmlFor={FOR_ID.TITLE}>{t('uploader.label.title')}</label>
                            <input id={FOR_ID.TITLE} className={styles.upload_title} type='text' name='title' autoComplete="off" />
                        </>
                    }

                    {
                        imageHostingService.features.file ?
                            <FileSelect fileConverter={imgstor.FileConverter} onchange={HandleSelectImage} hostingService={imageHostingService} transcodeLogs={transcodeLogs} /> :
                            <ImportExternalComponent onchange={HandleSelectImage} />
                    }

                    {
                        imageHostingService.features.description &&
                        <>
                            <label htmlFor={FOR_ID.DESCRIPTION}>{t('uploader.label.description')}</label>
                            <textarea id={FOR_ID.DESCRIPTION} className={styles.upload_description} name='description' autoComplete="off" />
                        </>
                    }

                    {
                        imageHostingService.features.save && <>
                            <div className={styles.upload_save}>
                                <div className={styles.upload_save_label}>{t("uploader.label.select-save")}</div>
                                <div className={styles.upload_save_value} data-enabled={save} onClick={HandleSetSave}></div>
                            </div>
                        </>
                    }

                    {
                        save &&
                        imageHostingService.features.tags &&
                        <TagsSelect imgstor={imgstor} onchange={HandleSelectTags} />
                    }
                </>
                }

                <div className={styles.options}>
                    <button type='reset' className={`${styles.upload_cancel} ${index_styles.button}`}>{t('main.back')}</button>
                    {selectedFile &&
                        <button type='submit' className={`${styles.upload_submit} ${index_styles.button}`}>
                            {t('main.post')}
                        </button>
                    }
                </div>

            </form>
            <TranscodeLogs.Component transcodeLogs={transcodeLogs} />
        </div>
    </>
}

export default Uploader;