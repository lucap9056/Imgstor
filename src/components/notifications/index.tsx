/**
 * 畫面右下角通知
 */
import React, { createContext, useContext, useEffect, useState } from 'react';

import MessageManager, { Message, MessageManagerEvent } from "structs/message";

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

                (notification) => <li className={styles.notification} key={notification.id} data-type={notification.type}>
                    <p className={styles.notification_message}>{notification.content}</p>
                    {notification.buttons.map(
                        (button, i) => <button key={notification.id + i} className={styles.notification_button}
                            data-id={notification.id || ""}
                            onClick={button.Click}>
                            {button.text}
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
        throw new Error("useNotifications must be used within an NotificationsProvider.");
    }
    return context;
};

export {
    NotificationsProvider,
    useNotifications
};