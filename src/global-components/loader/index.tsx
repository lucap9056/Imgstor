import React, { createContext, useContext, useEffect, useState } from "react";
import BaseEventSystem from "structs/event-dispatcher";

import styles from "./style.module.scss";

const LoaderContext = createContext<Loader | null>(null);

export const LoaderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const loader = new Loader();
    return <LoaderContext.Provider value={loader}>{children}</LoaderContext.Provider>;
};

export const useLoader = (): Loader => {
    const context = useContext(LoaderContext);
    if (!context) {
        throw new Error("useLoader 必須在 LoaderProvider 內使用");
    }
    return context;
};

export class Loading {
    private id: string;
    private loader: Loader;

    constructor(id: string, loader: Loader) {
        this.id = id;
        this.loader = loader;
    }

    public remove(): void {
        this.loader.removeLoading(this.id);
    }
}

type EventDefinitions = {
    "StateChanged": { detail: boolean }
};

export type LoadingStateEvent<T extends keyof EventDefinitions> = EventDefinitions[T];

export default class Loader extends BaseEventSystem<EventDefinitions> {

    public static readonly Component: React.FC = () => {
        const loader = useLoader();
        const [isLoading, setIsLoading] = useState(loader.IsLoading);

        useEffect(() => {

            const stateChangedHandler = (e: LoadingStateEvent<"StateChanged">) => {
                setIsLoading(e.detail);
            }

            loader.on("StateChanged", stateChangedHandler);

            return () => {
                loader.off("StateChanged", stateChangedHandler);
            }

        }, []);


        if (!isLoading) {
            return null;
        }

        return <div className={styles.container}>
            <div className={styles.loader}>
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

    public append(): Loading {
        const id = crypto.randomUUID();
        const loading = new Loading(id, this);

        this.loadings[id] = loading;

        this.updateLoadingState();
        return loading;
    }

    public removeLoading(loadingId: string): void {
        delete this.loadings[loadingId];

        this.updateLoadingState();
    }

    private updateLoadingState(): void {
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