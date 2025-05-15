/**
 * 畫面中央提示
 */
import React, { createContext, useContext, useEffect, useState } from 'react';

import MessageManager, { Message, MessageManagerEvent } from "structs/message";

import styles from "components/alerts/style.module.scss";

interface Props {
    manager: MessageManager
}

const Alerts: React.FC<Props> = ({ manager }) => {
    const [alert, setAlert] = useState<Message>();

    useEffect(() => {
        const AlertsChangedHandler = (e: MessageManagerEvent<"MessagesChanged">) => {
            if (e.detail.length === 0) {
                setAlert(undefined);
            }
            else {
                setAlert(e.detail[0]);
            }
        }

        manager.on("MessagesChanged", AlertsChangedHandler);
        return () => {
            manager.off("MessagesChanged", AlertsChangedHandler);
        }
    }, []);

    if (!alert) return <></>;

    return <Alert key={alert.id} content={alert} />;
}

export default Alerts;

const Alert: React.FC<{ content: Message }> = ({ content }) => {
    return <div className={styles.alert_container}>
        <div className={styles.alert} data-type={content.type}>
            <div className={styles.alert_message}>{content.content}</div>
            {content.buttons.map(
                (button, i) => <button key={content.id + i} className={styles.alert_button}
                    onClick={button.Click}>
                    {button.text}
                </button>
            )}
        </div>
    </div>
}

const AlertsContext = createContext<MessageManager | null>(null);

const AlertsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const imgstorAlerts = new MessageManager();
    return <AlertsContext.Provider value={imgstorAlerts}>{children}</AlertsContext.Provider>;
};

const useAlerts = (): MessageManager => {
    const context = useContext(AlertsContext);
    if (!context) {
        throw new Error("useAlerts must be used within an AlertsProvider.");
    }
    return context;
};

export {
    AlertsProvider,
    useAlerts
};