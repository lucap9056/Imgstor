import React, { useState } from "react";


import styles from "components/viewer/style.module.scss";
import ImgstorDB, { ImgstorImage } from "services/imgstor-db";
import { Message, MessageButton } from "structs/message";
import { useTranslation } from "react-i18next";
import { useAlerts } from "components/alerts";
import { useLoadingState } from "components/loading";
import { useNotifications } from "components/notifications";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPenToSquare } from "@fortawesome/free-solid-svg-icons";
import { useImgstor } from "services/imgstor";

interface Props {
    image: ImgstorImage
}

const Title: React.FC<Props> = ({ image }) => {
    const notifications = useNotifications();
    const loadingState = useLoadingState();
    const alerts = useAlerts();
    const { t } = useTranslation();
    const imgstorDB = useImgstor().DB;
    const [title, SetTitle] = useState(ImgstorDB.DecodeText(image.title));
    const [edit, SetEdit] = useState(false);

    if (edit) {

        const HandleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
            const { value } = e.currentTarget;

            if (value === title) {
                SetEdit(false);
                return;
            }

            const confirm = new MessageButton(t("main.confirm"));
            confirm.on("Clicked", () => {
                const loading = loadingState.Append();
                const saving = notifications.Append(
                    new Message({
                        type: Message.Type.ALERT,
                        content: t("main.saving")
                    })
                );

                try {
                    imgstorDB.UpdateImage({ ...image, title: ImgstorDB.EncodeText(value) });
                    imgstorDB.Save();
                }
                catch (err) {
                    notifications.Append(
                        new Message({
                            type: Message.Type.ERROR,
                            content: (err as Error).message
                        })
                    );
                }

                SetTitle(value);
                SetEdit(false);

                saving.Remove();
                loading.Remove();
            });

            const cancel = new MessageButton(t("main.cancel"));
            cancel.on("Clicked", () => {
                SetEdit(false);
            });

            alerts.Append(
                new Message({
                    type: Message.Type.ALERT,
                    content: t("viewer.alert.change-title", { old: title, new: value }),
                    buttons: [cancel, confirm]
                })
            );
        }

        return <input className={styles.viewer_title_edit} onBlur={HandleBlur} defaultValue={title} autoFocus />
    }

    const HandleEdit = () => {
        SetEdit(true);
    }

    return <div className={styles.viewer_title}>
        {title}
        <span className={styles.viewer_edit} onClick={HandleEdit}>
            <FontAwesomeIcon icon={faPenToSquare} />
        </span>
    </div>
}

export default Title;