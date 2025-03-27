import EventDispatcher from "structs/event-dispatcher";
import React, { useEffect, useRef, useState } from "react";

import styles from "components/uploader/transcode-logs/style.module.scss";


export class Transcode {
    private id: string;
    private transcodeLogs: TranscodeLogs;
    private state: boolean = false;
    public readonly abortController: AbortController = new AbortController();
    constructor(transcodeLogs: TranscodeLogs) {
        this.id = crypto.randomUUID();
        this.transcodeLogs = transcodeLogs;
    }

    public get Id(): string {
        return this.id;
    }

    public Remove(): void {
        const { id, transcodeLogs } = this;
        transcodeLogs.Remove(id);
    }

    public Done(): void {
        this.state = true;
    }

    public get State(): boolean {
        return this.state;
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

        const [isVisible, SetIsVisible] = useState(false);
        const [logs, SetLogs] = useState("");
        const [followScroll, SetFollowScroll] = useState(true);
        const logAreaRef = useRef<HTMLTextAreaElement>(null);

        useEffect(() => {
            const LogAppendedHandler = (e: TranscodeLogsEvent<"LogAppended">) => {
                SetLogs(logs => logs + e.detail);
            }

            const VisibleStateHandler = (e: TranscodeLogsEvent<"VisibleStateChanged">) => {

                if (e.detail) {
                    SetLogs("");
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
        }, [logs]);

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
            value={logs}
        />
    }

    private transcodeMap: { [id: string]: Transcode } = {};
    private state: boolean = false;
    public Println(msg: string): void {
        this.emit("LogAppended", { detail: msg + '\n' });
    }

    public Add(): Transcode {
        const transcode = new Transcode(this);
        this.transcodeMap[transcode.Id] = transcode;

        this.UpdateState();

        return transcode;
    }

    public Remove(id: string): void {
        const transcode = this.transcodeMap[id];

        if (transcode !== undefined) {
            delete this.transcodeMap[id];
            this.UpdateState();
        }
    }

    public Clear(): void {
        for (const id of Object.keys(this.transcodeMap)) {
            const transcode = this.transcodeMap[id];

            if (!transcode.State) {
                transcode.abortController.abort();
            }

            delete this.transcodeMap[id];
        }
        this.UpdateState();
    }

    private UpdateState(): void {
        const state = Object.keys(this.transcodeMap).length > 0;

        if (this.state !== state) {
            this.state = state;
            this.emit("VisibleStateChanged", { detail: state });
        }
    }

    public get Visibled(): boolean {
        return this.state;
    }
}