import React, { useState } from "react";


import styles from "components/viewer/style.module.scss";
import ImgstorDB, { ImgstorImage } from "services/imgstor-db";
import { useImgstor } from "services/imgstor";
import { Message, MessageButton } from "structs/message";
import { useTranslation } from "react-i18next";
import { useAlerts } from "components/alerts";
import { useLoadingState } from "components/loading";
import { useNotifications } from "components/notifications";
import { faPenToSquare } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

interface Props {
    image: ImgstorImage
}

const Description: React.FC<Props> = ({ image }) => {
    const notifications = useNotifications();
    const loadingState = useLoadingState();
    const alerts = useAlerts();
    const { t } = useTranslation();
    const imgstorDB = useImgstor().DB;
    const [description, SetDescription] = useState(ImgstorDB.DecodeText(image.description));
    const [edit, SetEdit] = useState(false);
    const lineHeight = 18;
    const [height, SetHeight] = useState((description.split(/\n/).length || 1) * lineHeight);


    if (edit) {

        const HandleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
            const { value } = e.currentTarget;

            if (value === description) {
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
                    imgstorDB.UpdateImage({ ...image, description: ImgstorDB.EncodeText(value) });
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

                SetDescription(value);
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
                    content: t("viewer.alert.change-description", { old: description, new: value }),
                    buttons: [cancel, confirm]
                })
            );
        }

        const HandleChanged = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
            const { value } = e.currentTarget;
            SetHeight((value.split(/\n/).length || 1) * lineHeight);
        }

        return <textarea
            className={styles.viewer_description_edit}
            style={{ height }}
            onBlur={HandleBlur}
            onChange={HandleChanged}
            defaultValue={description}
            autoFocus
        />
    }

    const HandleEdit = () => {
        SetEdit(true);
    }

    return <div className={styles.viewer_description}>
        {
            description.split(/\n/).map((line, index, lines) => (
                <React.Fragment key={index}>
                    {line}
                    {index < lines.length - 1 && <br />}
                </React.Fragment>
            ))
        }
        <span className={styles.viewer_edit} onClick={HandleEdit}>
            <FontAwesomeIcon icon={faPenToSquare} />
        </span>
    </div>
}

export default Description;