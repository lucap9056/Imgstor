/**
 * 畫面中央提示
 */
import React, { createContext, useContext, useEffect, useState } from 'react';

import MessageManager, { Message, MessageManagerEvent } from "utils/message";

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

    return <Alert key={alert.Id} content={alert} />;
}

export default Alerts;

class Alert extends React.Component<{ content: Message }> {
    constructor(props: { content: Message }) {
        super(props);
    }

    render(): React.ReactNode {
        const { content } = this.props;
        return <div className={styles.alert_container}>
            <div className={styles.alert} data-type={content.Type}>
                <p className={styles.alert_message}>{content.Text}</p>
                {content.Buttons.map(
                    (button, i) => <button key={content.Id + i} className={styles.alert_button}
                        onClick={button.Click}>
                        {button.Text}
                    </button>
                )}
            </div>
        </div>
    }
}



const AlertsContext = createContext<MessageManager | null>(null);

const AlertsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const imgstorAlerts = new MessageManager();
    return <AlertsContext.Provider value={imgstorAlerts}>{children}</AlertsContext.Provider>;
};

const useAlerts = (): MessageManager => {
    const context = useContext(AlertsContext);
    if (!context) {
        throw new Error("useAlerts 必須在 AlertsProvider 內使用");
    }
    return context;
};

export {
    AlertsProvider,
    useAlerts
};