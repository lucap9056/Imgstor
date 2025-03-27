import React, { useId, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { Message, MessageButton } from 'utils/message';

import Imgstor from 'services/imgstor';
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

interface Props {
    imgstor: Imgstor
}

const Uploader: React.FC<Props> = ({ imgstor }) => {
    const notifications = useNotifications();
    const loadingState = useLoadingState();
    const alerts = useAlerts();
    const { t } = useTranslation();
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
        const f = (file.Processed || file.Original).file;
        a.href = URL.createObjectURL(f);
        a.download = f.name;
        a.click();
        URL.revokeObjectURL(a.href);
    }

    const ImportExternalImage = async (hostingService: ImageHostingService, file: ImageFile) => {
        const image = await hostingService.Upload(save, file);
        const imageId = imgstor.DB.InsertImage(image);
        for (const tag of selectedTags) {
            imgstor.DB.InsertImageTag(imageId, tag.id);
        }

        const saving = new Message(Message.Type.NORMAL, t("uploader_notification_saving"));
        notifications.Append(saving);
        try {
            await imgstor.DB.Save();
        }
        catch (err) {
            notifications.Append(
                new Message(
                    Message.Type.ERROR,
                    t("uploader_notification_save_failed")
                )
            );
        }
        saving.Remove();

        const confirm = new MessageButton(t("uploader_notification_uploaded_confirm"));
        confirm.on("Clicked", () => {
            navigate(RoutePaths.HOME);
        });

        alerts.Append(
            new Message(
                Message.Type.ALERT,
                t("uploader_notification_uploaded"),
                [confirm]
            )
        );

    }

    const DefaultUploadImage = async (hostingService: ImageHostingService, file: ImageFile) => {

        const image = await hostingService.Upload(save, file);

        if (save) {
            const imageId = await imgstor.AppendImage(image, file.Original.file)
                .then((img) => imgstor.DB.InsertImage(img));

            for (const tag of selectedTags) {
                imgstor.DB.InsertImageTag(imageId, tag.id);
            }

            try {
                await imgstor.DB.Save();
            }
            catch (err) {
                notifications.Append(
                    new Message(
                        Message.Type.ERROR,
                        t("uploader_notification_save_failed")
                    )
                );
            }

            const copyLinkButton = new MessageButton(
                t("uploader_notification_uploaded_copy_link"),
                { auto_remove: false }
            );
            copyLinkButton.on("Clicked", () => {
                navigator.clipboard.writeText(image.link);

                notifications.Append(
                    new Message(
                        Message.Type.NORMAL,
                        t("uploader_notification_link_copied")
                    )
                );
            });


            const confirmButton = new MessageButton(t("uploader_notification_uploaded_confirm"));
            confirmButton.on("Clicked", () => {
                navigate(RoutePaths.HOME);
            });

            alerts.Append(
                new Message(
                    Message.Type.ALERT,
                    t("uploader_notification_uploaded"),
                    [copyLinkButton, confirmButton]
                )
            );

        } else {
            const deleteButton = new MessageButton("uploader_notification_uploaded_delete");
            deleteButton.on("Clicked", () => {
                hostingService.Delete(image);
                navigate(RoutePaths.HOME);
            });

            const copyLinkButton = new MessageButton(
                t("uploader_notification_uploaded_copy_link"),
                { auto_remove: false }
            );

            copyLinkButton.on("Clicked", () => {
                navigator.clipboard.writeText(image.link);

                notifications.Append(
                    new Message(
                        Message.Type.NORMAL,
                        t("uploader_notification_link_copied")
                    )
                );
            });

            const confirmButton = new MessageButton(t("uploader_notification_uploaded_confirm"));
            confirmButton.on("Clicked", () => {
                navigate(RoutePaths.HOME);
            });

            alerts.Append(
                new Message(
                    Message.Type.ALERT,
                    t("uploader_notification_uploaded"),
                    [deleteButton, copyLinkButton, confirmButton]
                )
            );
        }

    }

    const ConfirmUploadImage = async (form: FormData, file: ImageFile) => {
        if (!imageHostingService) {
            return;
        }


        const loading = loadingState.Append();

        const notification = new Message(Message.Type.NORMAL, t("uploader_notification_uploading"))
        notifications.Append(notification);


        file.Title = (form.get("title") || "").toString();
        file.Description = (form.get("description") || "").toString();

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
            notifications.Append(
                new Message(
                    Message.Type.ERROR,
                    (err as Error).message
                )
            );
        }

        loading.Remove();
        notification.Remove();

    }

    const HandleUpload = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (!selectedFile) return;

        const file = selectedFile.Original.file;

        if (!file) return;

        const form = new FormData(e.target as HTMLFormElement);

        const cancel = new MessageButton(t("uploader_upload_cancel"));

        const confirm = new MessageButton(t("uploader_upload_confirm"));
        confirm.on("Clicked", () => {
            ConfirmUploadImage(form, selectedFile);
        })

        alerts.Append(
            new Message(
                Message.Type.NORMAL,
                t("uploader_upload_alert"),
                [cancel, confirm]
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
                        imageHostingService.features.Description &&
                        <>
                            <label htmlFor={FOR_ID.TITLE}>{t('uploader_title')}</label>
                            <input id={FOR_ID.TITLE} className={styles.upload_title} type='text' name='title' autoComplete="off" />
                        </>
                    }

                    {
                        imageHostingService.features.File ?
                            <FileSelect fileConverter={imgstor.FileConverter} onchange={HandleSelectImage} hostingService={imageHostingService} transcodeLogs={transcodeLogs} /> :
                            <ImportExternalComponent onchange={HandleSelectImage} />
                    }

                    {
                        imageHostingService.features.Description &&
                        <>
                            <label htmlFor={FOR_ID.DESCRIPTION}>{t('uploader_description')}</label>
                            <textarea id={FOR_ID.DESCRIPTION} className={styles.upload_description} name='description' autoComplete="off" />
                        </>
                    }

                    {
                        imageHostingService.features.Save && <>
                            <div className={styles.upload_save}>
                                <div className={styles.upload_save_label}>{t("uploader_select_save")}</div>
                                <div className={styles.upload_save_value} data-enabled={save} onClick={HandleSetSave}></div>
                            </div>
                        </>
                    }

                    {
                        save &&
                        imageHostingService.features.Tags &&
                        <TagsSelect imgstor={imgstor} onchange={HandleSelectTags} />
                    }
                </>
                }

                <div className={styles.options}>
                    <button type='reset' className={`${styles.upload_cancel} ${index_styles.button}`}>{t('uploader_back')}</button>
                    {selectedFile &&
                        <button type='submit' className={`${styles.upload_submit} ${index_styles.button}`}>
                            {t('uploader_post')}
                        </button>
                    }
                </div>

            </form>
            <TranscodeLogs.Component transcodeLogs={transcodeLogs} />
        </div>
    </>
}

export default Uploader;