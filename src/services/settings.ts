import { merge } from "lodash";
import BaseEventSystem from "structs/eventSystem";
import { Drive } from "services/google";

export interface ImgstorConfig {
    fileId: string
    version: number
    hostingServices: {
        local: {
            enabled: boolean
        },
        importExternal: {
            enabled: boolean
        },
        imgur: {
            enabled: boolean
            clientId: string
        },
        catbox: {
            enabled: boolean
            proxy: string
            userhash: string
        },
        smms: {
            enabled: boolean
            proxy: string
            token: string
        }
    }
}

const enum ConfigFile {
    name = ".config.json",
    type = "application/json"
}

type SettingsEventDefinitions = {
    "DisplayChanged": { detail: boolean }
    "StatusChanged": { detail: boolean }
    "ConfigChanged": { detail: ImgstorConfig }
};
export type SettingsEvent<T extends keyof SettingsEventDefinitions> = SettingsEventDefinitions[T];

export default class Settings extends BaseEventSystem<SettingsEventDefinitions> {

    public static readonly DefaultConfig: ImgstorConfig = {
        fileId: "",
        version: 1,
        hostingServices: {
            local: {
                enabled: false,
            },
            importExternal: {
                enabled: true,
            },
            imgur: {
                enabled: false,
                clientId: ""
            },
            catbox: {
                enabled: false,
                proxy: "",
                userhash: ""
            },
            smms: {
                enabled: false,
                proxy: "",
                token: ""
            }
        }
    }

    public static New = function (drive: Drive): Promise<Settings> {

        return new Promise((resolve, reject) => {

            drive.SearchFiles([], ConfigFile.name).then(({ files }) => {
                if (!files) {
                    return reject(new Error());
                }

                if (files.length !== 0) {

                    const fileId = files[0].id;

                    if (!fileId) {
                        return reject(new Error());
                    }

                    drive.ReadFile(fileId)
                        .then((res) => {
                            if (res === "") {
                                return { ...Settings.DefaultConfig };
                            }

                            return JSON.parse(res);
                        })
                        .then((config: ImgstorConfig) => {
                            config.fileId = fileId;

                            const settings = new Settings(merge({ ...Settings.DefaultConfig }, config), drive);
                            resolve(settings);

                        }).catch(reject);
                }
                else {
                    const settings = new Settings(Settings.DefaultConfig, drive);
                    resolve(settings);
                }
            }).catch(reject);

        });

    }

    private config: ImgstorConfig;
    private drive: Drive;

    constructor(config: ImgstorConfig, drive: Drive) {
        super();
        this.config = config;
        this.drive = drive;
    }

    public async SaveConfig(newConfig: ImgstorConfig): Promise<ImgstorConfig> {
        const { drive } = this;

        const fileId = await (async (drive: Drive, cfg: ImgstorConfig): Promise<string> => {

            if (cfg.fileId !== "") {
                return cfg.fileId;
            }

            const res = await drive.CreateFile(ConfigFile.name, ConfigFile.type);
            if (!res.id) {
                throw new Error();
            }

            return res.id;

        })(this.drive, this.config);

        const version = new Date().getTime();

        const config: ImgstorConfig = { ...newConfig, fileId, version };

        const configStr = JSON.stringify(config);

        const configBlob = new Blob([configStr], { type: ConfigFile.type });
        const file = new File([configBlob], ConfigFile.name, { type: ConfigFile.type });

        await drive.WriteFile(config.fileId, file);

        this.config = config;
        this.emit("ConfigChanged", { detail: config });

        return config;

    }

    public get Config(): ImgstorConfig {
        return Object.assign({}, this.config);
    }

    public set Display(display: boolean) {
        this.emit("DisplayChanged", { detail: display });
    }
}