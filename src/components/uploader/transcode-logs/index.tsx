import EventDispatcher from "structs/event-dispatcher";
import React, { useEffect, useRef, useState } from "react";

import styles from "./style.module.scss";


export class Transcode {
    public readonly id: string;
    private transcodeLogs: TranscodeLogs;
    private transcodeState: boolean = false;
    public readonly abortController: AbortController = new AbortController();
    constructor(transcodeLogs: TranscodeLogs) {
        this.id = crypto.randomUUID();
        this.transcodeLogs = transcodeLogs;
    }

    public remove(): void {
        const { id, transcodeLogs } = this;
        transcodeLogs.remove(id);
    }

    public done(): void {
        this.transcodeState = true;
    }

    public get state(): boolean {
        return this.transcodeState;
    }
}

interface Props {
    transcodeLogs: TranscodeLogs
}

type TranscodeLogsEventDefinitions = {
    "LogAppended": { detail: string }
    "VisibleStateChanged": { detail: boolean }
};
export type TranscodeLogsEvent<T extends keyof TranscodeLogsEventDefinitions> = TranscodeLogsEventDefinitions[T];

export default class TranscodeLogs extends EventDispatcher<TranscodeLogsEventDefinitions> {

    public static readonly Component: React.FC<Props> = ({ transcodeLogs }) => {

        const [isVisible, setIsVisible] = useState(false);
        const [logs, SetLogs] = useState("");
        const [followScroll, setFollowScroll] = useState(true);
        const logAreaRef = useRef<HTMLTextAreaElement>(null);

        useEffect(() => {
            const logAppendedHandler = (e: TranscodeLogsEvent<"LogAppended">) => {
                SetLogs(logs => logs + e.detail);
            }

            const visibleStateHandler = (e: TranscodeLogsEvent<"VisibleStateChanged">) => {

                if (e.detail) {
                    SetLogs("");
                }

                setIsVisible(e.detail);
            }

            transcodeLogs.on("LogAppended", logAppendedHandler);
            transcodeLogs.on("VisibleStateChanged", visibleStateHandler);

            return () => {
                transcodeLogs.off("LogAppended", logAppendedHandler);
                transcodeLogs.off("VisibleStateChanged", visibleStateHandler);
            }
        }, []);

        useEffect(() => {
            if (logAreaRef.current === null || !followScroll) {
                return;
            }

            const newScrollTopMax = logAreaRef.current.scrollHeight - logAreaRef.current.clientHeight;
            logAreaRef.current.scrollTop = newScrollTopMax;
        }, [logs]);

        if (!isVisible) {
            return <></>
        }

        const logAreaScroll = (e: React.UIEvent) => {
            const logArea = e.currentTarget;
            if (!logArea || !e.isTrusted) return;
            setFollowScroll(logArea.scrollTop === logArea.scrollHeight - logArea.clientHeight);
        }

        return <textarea
            onScroll={logAreaScroll}
            ref={logAreaRef}
            className={styles.transcoding}
            readOnly
            value={logs}
        />
    }

    private transcodeMap: { [id: string]: Transcode } = {};
    private state: boolean = false;
    public println(msg: string): void {
        this.emit("LogAppended", { detail: msg + '\n' });
    }

    public add(): Transcode {
        const transcode = new Transcode(this);
        this.transcodeMap[transcode.id] = transcode;

        this.updateState();

        return transcode;
    }

    public remove(id: string): void {
        const transcode = this.transcodeMap[id];

        if (transcode !== undefined) {
            delete this.transcodeMap[id];
            this.updateState();
        }
    }

    public clear(): void {
        for (const id of Object.keys(this.transcodeMap)) {
            const transcode = this.transcodeMap[id];

            if (!transcode.state) {
                transcode.abortController.abort();
            }

            delete this.transcodeMap[id];
        }
        this.updateState();
    }

    private updateState(): void {
        const state = Object.keys(this.transcodeMap).length > 0;

        if (this.state !== state) {
            this.state = state;
            this.emit("VisibleStateChanged", { detail: state });
        }
    }

    public get visibled(): boolean {
        return this.state;
    }
}