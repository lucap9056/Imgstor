import React, { useEffect, useRef, useState } from "react";

import TranscodeLogs, { TranscodeLogsEvent } from "components/uploader/transcode-logs/script";

import styles from "components/uploader/transcode-logs/style.module.scss";

interface Props {
    transcodeLogs: TranscodeLogs
}

const TranscodeLogsComponent: React.FC<Props> = ({ transcodeLogs }) => {
    const [isVisible, SetIsVisible] = useState(false);
    const [logContent, SetLogContent] = useState("");
    const [followScroll, SetFollowScroll] = useState(true);
    const logAreaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        let logBuffer = "";
        const LogAppendedHandler = (e: TranscodeLogsEvent<"LogAppended">) => {
            logBuffer += e.detail;
            SetLogContent(logBuffer);
        }

        const VisibleStateHandler = (e: TranscodeLogsEvent<"VisibleStateChanged">) => {

            if (e.detail) {
                logBuffer = "";
                SetLogContent(logBuffer);
            }

            SetIsVisible(e.detail);
        }

        transcodeLogs.on("LogAppended", LogAppendedHandler);
        transcodeLogs.on("VisibleStateChanged", VisibleStateHandler);

        return () => {
            transcodeLogs.off("LogAppended", LogAppendedHandler);
            transcodeLogs.off("VisibleStateChanged", VisibleStateHandler);
        }
    }, []);

    useEffect(() => {
        if (logAreaRef.current === null || !followScroll) {
            return;
        }

        const newScrollTopMax = logAreaRef.current.scrollHeight - logAreaRef.current.clientHeight;
        logAreaRef.current.scrollTop = newScrollTopMax;
    }, [logContent]);

    if (!isVisible) {
        return <></>
    }

    const LogAreaScroll = (e: React.UIEvent) => {
        const logArea = e.currentTarget;
        if (!logArea || !e.isTrusted) return;
        SetFollowScroll(logArea.scrollTop === logArea.scrollHeight - logArea.clientHeight);
    }

    return <textarea
        onScroll={LogAreaScroll}
        ref={logAreaRef}
        className={styles.transcoding}
        readOnly
        value={logContent}
    />
}

export default TranscodeLogsComponent;