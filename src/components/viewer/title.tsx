import React, { useState } from "react";


import styles from "components/viewer/style.module.scss";
import ImgstorDB, { ImgstorImage } from "services/imgstor-db";
import { Message, MessageButton } from "utils/message";
import { useTranslation } from "react-i18next";
import { useAlerts } from "components/alerts";
import { useLoadingState } from "components/loading";
import { useNotifications } from "components/notifications";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPenToSquare } from "@fortawesome/free-solid-svg-icons";

interface Props {
    imgstorDB: ImgstorDB
    image: ImgstorImage
}

const Title: React.FC<Props> = ({ imgstorDB, image }) => {
    const notifications = useNotifications();
    const loadingState = useLoadingState();
    const alerts = useAlerts();
    const { t } = useTranslation();
    const [title, SetTitle] = useState(ImgstorDB.DecodeText(image.title));
    const [edit, SetEdit] = useState(false);

    if (edit) {

        const HandleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
            const { value } = e.currentTarget;

            if (value === title) {
                SetEdit(false);
                return;
            }

            const confirm = new MessageButton(t("viewer_title_change_confirm"));
            confirm.on("Clicked", () => {
                const loading = loadingState.Append();
                const saving = new Message(
                    Message.Type.ALERT,
                    t("viewer_title_change_confirm")
                );

                try {
                    imgstorDB.UpdateImage({ ...image, title: ImgstorDB.EncodeText(value) });
                    imgstorDB.Save();
                }
                catch (err) {
                    notifications.Append(
                        new Message(
                            Message.Type.ERROR,
                            (err as Error).message
                        )
                    );
                }

                SetTitle(value);
                SetEdit(false);

                saving.Remove();
                loading.Remove();
            });

            const cancel = new MessageButton(t("viewer_title_change_cancel"));
            cancel.on("Clicked", () => {
                SetEdit(false);
            });

            alerts.Append(
                new Message(
                    Message.Type.ALERT,
                    t("viewer_title_change_alert", { old: title, new: value }),
                    [cancel, confirm]
                )
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