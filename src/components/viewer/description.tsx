import React, { useState } from "react";


import styles from "components/viewer/style.module.scss";
import ImgstorDB, { ImgstorImage } from "services/imgstor-db";
import { IonIcon } from "@ionic/react";
import { Message, MessageButton } from "utils/message";
import { useTranslation } from "react-i18next";
import { imgstorAlerts } from "components/alerts";
import { loadingManager } from "components/loading";
import { imgstorNotifications } from "components/notifications";

interface Props {
    imgstorDB: ImgstorDB
    image: ImgstorImage
}

const Description: React.FC<Props> = ({ imgstorDB, image }) => {
    const { t } = useTranslation();
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

            const confirm = new MessageButton(t("viewer_description_change_confirm"));
            confirm.on("Clicked", () => {
                const loading = loadingManager.Append();
                const saving = new Message(
                    Message.Type.ALERT,
                    t("viewer_description_change_confirm")
                );

                try {
                    imgstorDB.UpdateImage({ ...image, description: ImgstorDB.EncodeText(value) });
                    imgstorDB.Save();
                }
                catch (err) {
                    imgstorNotifications.Append(
                        new Message(
                            Message.Type.ERROR,
                            (err as Error).message
                        )
                    );
                }

                SetDescription(value);
                SetEdit(false);

                saving.Remove();
                loading.Remove();
            });

            const cancel = new MessageButton(t("viewer_description_change_cancel"));
            cancel.on("Clicked", () => {
                SetEdit(false);
            });

            imgstorAlerts.Append(
                new Message(
                    Message.Type.ALERT,
                    t("viewer_description_change_alert", { old: description, new: value }),
                    [cancel, confirm]
                )
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
        <span className={styles.viewer_edit} onClick={HandleEdit}><IonIcon icon="pencil" /></span>
    </div>
}

export default Description;