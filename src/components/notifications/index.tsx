/**
 * 畫面右下角通知
 */
import React, { createContext, useContext, useEffect, useState } from 'react';

import MessageManager, { Message, MessageManagerEvent } from "utils/message";

import styles from "components/notifications/style.module.scss";


interface Props {
    manager: MessageManager
}

const Notifications: React.FC<Props> = ({ manager }) => {
    const [notifications, setNotifications] = useState<Message[]>([]);

    useEffect(() => {

        function NotificationsChangedHandler(e: MessageManagerEvent<"MessagesChanged">) {

            setNotifications([...e.detail]);

        }

        manager.on("MessagesChanged", NotificationsChangedHandler);
        return () => {
            manager.off("MessagesChanged", NotificationsChangedHandler);
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


const NotificationsContext = createContext<MessageManager | null>(null);

const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const manager = new MessageManager();
    return <NotificationsContext.Provider value={manager}>{children}</NotificationsContext.Provider>;
};

const useNotifications = (): MessageManager => {
    const context = useContext(NotificationsContext);
    if (!context) {
        throw new Error("useNotifications 必須在 NotificationsProvider 內使用");
    }
    return context;
};

export {
    NotificationsProvider,
    useNotifications
};