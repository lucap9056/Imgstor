import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";

import { useNotifications } from "global-components/notifications";
import { useAlerts } from "global-components/alerts";
import { useLoader } from "global-components/loader";

import RoutePaths from "route-paths";

import ImgstorDB, { ImgstorImage } from "services/imgstor-db";
import { Message, MessageButton } from "structs/message";
import { useTranslation } from "react-i18next";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHouse, faPenToSquare } from "@fortawesome/free-solid-svg-icons";
import { useImgstor } from "services/imgstor";

import styles from "./style.module.scss";

interface Props {
    image: ImgstorImage
}

const Header: React.FC<Props> = ({ image }) => {
    const navigate = useNavigate();
    const notifications = useNotifications();
    const loader = useLoader();
    const alerts = useAlerts();
    const { t } = useTranslation();
    const imgstorDB = useImgstor().db;
    const [title, setTitle] = useState(ImgstorDB.DecodeText(image.title));
    const [edit, setEdit] = useState(false);
    const titleRef = useRef<HTMLInputElement>(null);


    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        if (!edit) return;

        const { currentTarget } = e;
        const value = currentTarget.value;

        if (value === title) {
            setEdit(false);
            return;
        }

        e.stopPropagation();
        e.preventDefault();

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
                imgstorDB.UpdateImage({ ...image, title: ImgstorDB.EncodeText(value) });
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

            setTitle(value);
            setEdit(false);

            saving.remove();
            loading.remove();
        });

        const cancel = new MessageButton(t("main.cancel"));
        cancel.on("Clicked", () => {
            setEdit(false);
            currentTarget.value = title;
        });

        alerts.append(
            new Message({
                type: Message.Type.ALERT,
                content: t("viewer.alert.change-title", { old: title, new: value }),
                buttons: [cancel, confirm]
            })
        );
    }

    const handleHome = () => {
        navigate(RoutePaths.HOME);
    }

    const handleEdit = () => {
        if (edit) return;
        setEdit(true);
        if (titleRef.current) {
            titleRef.current.focus();
            titleRef.current.select();
        }
    }

    return <div className={styles.header}>
        <div className={styles.main}>
            <button className={styles.icon} onClick={handleHome}>
                <FontAwesomeIcon icon={faHouse} />
            </button>
            <div className={styles.title}>
                <input ref={titleRef} className={styles.content} onBlur={handleBlur} defaultValue={title} placeholder={"none-title"} readOnly={!edit} />
                <button className={styles.icon} onClick={handleEdit}>
                    <FontAwesomeIcon icon={faPenToSquare} />
                </button>
            </div>
        </div>
    </div>
}

export default Header;