/**
 * Loading畫面
 */
import { useEffect, useState } from 'react';

import loadingManager, { LoadingEvent } from './script';
import styles from "components/loading/style.module.scss";

const LoadingComponent = () => {
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const StatusChangedHandler = (e: LoadingEvent<"StatusChanged">) => {
            setLoading(e.detail);
        }

        loadingManager.on("StatusChanged", StatusChangedHandler);

        return () => {
            loadingManager.off("StatusChanged", StatusChangedHandler);
        }
    }, []);

    if (!loading) return <></>;

    return <div className={styles.loading_container}>
        <div className={styles.loading}>
            <div className={styles.triangle}></div>
            <div className={styles.line}></div>
            <div className={styles.triangle}></div>
            <div className={styles.line}></div>
            <div className={styles.triangle}></div>
            <div className={styles.line}></div>
            <div className={styles.triangle}></div>
            <div className={styles.line}></div>
        </div>
    </div>
}

export {
    loadingManager
}

export default LoadingComponent;