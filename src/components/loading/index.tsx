import React, { createContext, useContext, useEffect, useState } from "react";
import BaseEventSystem from "structs/event-dispatcher";

import styles from "components/loading/style.module.scss";

class Loading {
    private id: string;
    private state: LoadingState;

    constructor(id: string, state: LoadingState) {
        this.id = id;
        this.state = state;
    }

    public Remove(): void {
        this.state.RemoveLoading(this.id);
    }
}

interface Props {
    manager: LoadingState
}

type EventDefinitions = {
    "StateChanged": { detail: boolean }
};

export type LoadingStateEvent<T extends keyof EventDefinitions> = EventDefinitions[T];

class LoadingState extends BaseEventSystem<EventDefinitions> {

    public static readonly Component: React.FC<Props> = ({ manager }) => {
        const [loading, SetLoading] = useState(manager.IsLoading);

        useEffect(() => {

            const StateChangedHandler = (e: LoadingStateEvent<"StateChanged">) => {
                SetLoading(e.detail);
            }

            manager.on("StateChanged", StateChangedHandler);

            return () => {
                manager.off("StateChanged", StateChangedHandler);
            }

        }, []);


        if (!loading) {
            return null;
        }

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

    private loadings: { [loadingId: string]: Loading } = {};
    private state: boolean = false;

    public Append(): Loading {
        const id = crypto.randomUUID();
        const loading = new Loading(id, this);

        this.loadings[id] = loading;

        this.UpdateLoadingState();
        return loading;
    }

    public RemoveLoading(loadingId: string): void {
        delete this.loadings[loadingId];

        this.UpdateLoadingState();
    }

    private UpdateLoadingState(): void {
        const newState = Object.keys(this.loadings).length > 0;
        if (newState !== this.state) {
            this.state = newState;
            this.emit("StateChanged", { detail: newState });
        }
    }

    public get IsLoading(): boolean {
        return this.state;
    }
}


const LoadingContext = createContext<LoadingState | null>(null);

const LoadingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const manager = new LoadingState();
    return <LoadingContext.Provider value={manager}>{children}</LoadingContext.Provider>;
};

const useLoadingState = (): LoadingState => {
    const context = useContext(LoadingContext);
    if (!context) {
        throw new Error("useLoadingState 必須在 LoadingProvider 內使用");
    }
    return context;
};

export default LoadingState;
export {
    Loading,
    LoadingProvider,
    useLoadingState
};