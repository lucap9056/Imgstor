import React, { useId, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import RoutePaths from 'route-paths';

import { Message, MessageButton } from 'structs/message';
import { useNotifications } from 'global-components/notifications';
import { useAlerts } from 'global-components/alerts';
import { useLoader } from 'global-components/loader';

import { useImgstor } from 'services/imgstor';
import { ImgstorTag } from "services/imgstor-db";
import { ImageFile, ImageHostingService } from 'services/image-hosting-services';
import ImportExternal from 'services/image-hosting-services/import-external';
import Local from 'services/image-hosting-services/local';

import ImportExternalComponent from "components/uploader/import-external";
import TranscodeLogs from "components/uploader/transcode-logs";
import FileSelect from "components/uploader/file-select";
import TagsSelect from 'components/uploader/tags-select';
import HostingServiceSelect from 'components/uploader/hosting-service-select';

import styles from "./style.module.scss";

const Uploader: React.FC = () => {
    const notifications = useNotifications();
    const loader = useLoader();
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
        const imageId = imgstor.db.InsertImage(image);
        for (const { tagId } of selectedTags) {
            imgstor.db.InsertImageTag(imageId, tagId);
        }

        const saving = new Message({
            type: Message.Type.NORMAL,
            content: t("uploader.notification.saving")
        });
        notifications.append(saving);
        try {
            await imgstor.db.Save();
        }
        catch (err) {
            notifications.append(
                new Message({
                    type: Message.Type.ERROR,
                    content: t("uploader.notification.save-failed")
                })
            );
        }
        saving.remove();

        const confirm = new MessageButton(t("main.confirm"));
        confirm.on("Clicked", () => {
            navigate(RoutePaths.HOME);
        });

        alerts.append(
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
            const imageId = await imgstor.appendImage(image, file.original.file)
                .then((img) => imgstor.db.InsertImage(img));

            for (const { tagId } of selectedTags) {
                imgstor.db.InsertImageTag(imageId, tagId);
            }

            try {
                await imgstor.db.Save();
            }
            catch (err) {
                notifications.append(
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

                notifications.append(
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

            alerts.append(
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

                notifications.append(
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

            alerts.append(
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


        const loading = loader.append();

        const notification = new Message({
            type: Message.Type.NORMAL,
            content: t("uploader.notification.uploading")
        })
        notifications.append(notification);


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
            notifications.append(
                new Message({
                    type: Message.Type.ERROR,
                    content: (err as Error).message
                })
            );
        }

        loading.remove();
        notification.remove();

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

        alerts.append(
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
                <label>{t('uploader.label.hosting-service')}</label>
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
                            <FileSelect fileConverter={imgstor.converter} onchange={HandleSelectImage} hostingService={imageHostingService} transcodeLogs={transcodeLogs} /> :
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
                    <button type='reset' className={styles.upload_cancel}>{t('main.back')}</button>
                    {selectedFile &&
                        <button type='submit' className={styles.upload_submit}>
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