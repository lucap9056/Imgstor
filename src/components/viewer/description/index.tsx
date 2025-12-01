import React, { useEffect, useRef, useState } from "react";

import { useNotifications } from "global-components/notifications";
import { useAlerts } from "global-components/alerts";
import { useLoader } from "global-components/loader";

import ImgstorDB, { ImgstorImage } from "services/imgstor-db";
import { useImgstor } from "services/imgstor";
import { Message, MessageButton } from "structs/message";
import { useTranslation } from "react-i18next";
import { faAsterisk, faPenToSquare } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import styles from "./style.module.scss";

interface Props {
    image: ImgstorImage
}

const Description: React.FC<Props> = ({ image }) => {
    const notifications = useNotifications();
    const loader = useLoader();
    const alerts = useAlerts();
    const { t } = useTranslation();
    const imgstorDB = useImgstor().db;
    const [description, setDescription] = useState(ImgstorDB.DecodeText(image.description));
    const [edit, setEdit] = useState(false);
    const textAreaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (edit && textAreaRef.current) {
            textAreaRef.current.focus();
        }
    }, [edit]);

    const setTextAreaHeight = (element: HTMLTextAreaElement) => {
        element.style.height = "auto";
        element.style.height = element.scrollHeight + "px";
    }

    const handleBlur = ({ currentTarget }: React.FocusEvent<HTMLTextAreaElement>) => {
        if (!edit) return;
        const value = currentTarget.value;

        if (value === description) {
            setEdit(false);
            return;
        }

        const confirm = new MessageButton(t("main.confirm"));
        confirm.on("Clicked", () => {
            const loading = loader.append();
            const saving = notifications.append(
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
                notifications.append(
                    new Message({
                        type: Message.Type.ERROR,
                        content: (err as Error).message
                    })
                );
            }

            setDescription(value);
            setEdit(false);

            saving.remove();
            loading.remove();
        });

        const cancel = new MessageButton(t("main.cancel"));
        cancel.on("Clicked", () => {
            currentTarget.value = description;
            setEdit(false);
            setTextAreaHeight(currentTarget);
        });

        alerts.append(
            new Message({
                type: Message.Type.ALERT,
                content: t("viewer.alert.change-description", { old: description, new: value }),
                buttons: [cancel, confirm]
            })
        );
    }

    const handleChanged = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setTextAreaHeight(e.currentTarget);
    }

    const handleEdit = () => {
        setEdit(true);
    }

    return <div className={styles.description}>
        <div className={styles.icon}>
            <FontAwesomeIcon icon={faAsterisk} />
        </div>
        <textarea
            ref={textAreaRef}
            readOnly={!edit}
            defaultValue={description}
            onBlur={handleBlur}
            onChange={handleChanged}
        />
        {!edit && <button className={styles.edit} onClick={handleEdit}>
            <FontAwesomeIcon icon={faPenToSquare} />
        </button>
        }
    </div>
}

export default Description;