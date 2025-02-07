/**
 * 畫面右下角通知
 */
import React, { useEffect, useState } from 'react';

import { Message, MessageManagerEvent } from "utils/message";

import imgstorNotifications from "./script";
import styles from "components/notifications/style.module.scss";

export {
    imgstorNotifications
}

const Notifications: React.FC = () => {
    const [notifications, setNotifications] = useState<Message[]>([]);

    useEffect(() => {

        function NotificationsChangedHandler(e: MessageManagerEvent<"MessagesChanged">) {

            setNotifications([...e.detail]);

        }

        imgstorNotifications.on("MessagesChanged", NotificationsChangedHandler);
        return () => {
            imgstorNotifications.off("MessagesChanged", NotificationsChangedHandler);
        }
    }, []);

    if (notifications.length > 0) {
        return <div className={styles.notifications}>
            {notifications.map(

                (content) => <li className={styles.notification} key={content.Id} data-type={content.Type}>
                    <p className={styles.notification_message}>{content.Text}</p>
                    {content.Buttons.map(
                        (button, i) => <button key={content.Id + i} className={styles.notification_button}
                            data-id={content.Id || ""}
                            onClick={button.Click}>
                            {button.Text}
                        </button>
                    )}
                </li>

            )}
        </div>
    }
    else return <></>;
}

export default Notifications;
