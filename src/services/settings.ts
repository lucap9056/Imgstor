import { merge } from "lodash";
import EventDispatcher from "structs/event-dispatcher";
import { Drive } from "services/google";
import { buildResult } from "resultant.js/rustify";

export interface HostingServicesConfig {
    version: number,
    local: {
        isEnabled: boolean
    },
    importExternal: {
        isEnabled: boolean
    },
    imgur: {
        isEnabled: boolean
        clientId: string
    },
    catbox: {
        isEnabled: boolean
        proxy: string
        userhash: string
        separatePreviewUpload: boolean
    },
    smms: {
        isEnabled: boolean
        proxy: string
        token: string
        separatePreviewUpload: boolean
    }
}

export interface ImgstorConfig {
    fileId: string
    version: number
    database: {
        version: number
    }
    hostingServices: HostingServicesConfig
}

const enum ConfigFile {
    name = ".config.json",
    type = "application/json"
}

type SettingsEventDefinitions = {
    "DisplayChanged": { detail: { display: boolean } }
    "StatusChanged": { detail: boolean }
    "ConfigChanged": { detail: { config: ImgstorConfig } }
};
export type SettingsEvent<T extends keyof SettingsEventDefinitions> = SettingsEventDefinitions[T];

export default class Settings extends EventDispatcher<SettingsEventDefinitions> {

    public static readonly VERSION = 1;
    public static readonly DATABASE_VERSION = 1;
    public static readonly HOSTING_SERVICE_VERSION = 1;

    public static readonly DefaultConfig: ImgstorConfig = {
        fileId: "",
        version: Settings.VERSION,
        database: {
            version: Settings.DATABASE_VERSION
        },
        hostingServices: {
            version: Settings.HOSTING_SERVICE_VERSION,
            local: {
                isEnabled: false,
            },
            importExternal: {
                isEnabled: true,
            },
            imgur: {
                isEnabled: false,
                clientId: ""
            },
            catbox: {
                isEnabled: false,
                proxy: "",
                userhash: "",
                separatePreviewUpload: true
            },
            smms: {
                isEnabled: false,
                proxy: "",
                token: "",
                separatePreviewUpload: true
            }
        }
    }

    public static new = function (drive: Drive): Promise<Settings> {

        return new Promise((resolve, reject) => {

            drive.searchFiles([], ConfigFile.name).then(({ files }) => {

                if (!files) {
                    return reject(new Error());
                }

                if (files.length !== 0) {

                    const fileId = files[0].id;

                    if (!fileId) {
                        return reject(new Error());
                    }

                    drive.readFile(fileId)
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

    private imgstorConfig: ImgstorConfig;
    private googleDrive: Drive;

    constructor(imgstorConfig: ImgstorConfig, googleDrive: Drive) {
        super();
        this.imgstorConfig = imgstorConfig;
        this.googleDrive = googleDrive;
    }

    public async saveConfig(config: ImgstorConfig): Promise<ImgstorConfig> {
        const { googleDrive, imgstorConfig } = this;

        const version = new Date().getTime();

        const updatedConfig = await buildResult(async () => {
            if (imgstorConfig.fileId !== "") {
                const { fileId } = imgstorConfig;
                return { ...config, fileId, version };
            }
            const res = await googleDrive.createFile(ConfigFile.name, ConfigFile.type);
            if (!res.id) {
                throw new Error();
            }

            const fileId = res.id;
            return { ...config, fileId, version };
        }).then((r) => r.unwrap());

        const updatedConfigString = JSON.stringify(updatedConfig);

        const updatedConfigBlob = new Blob([updatedConfigString], { type: ConfigFile.type });
        const file = new File([updatedConfigBlob], ConfigFile.name, { type: ConfigFile.type });

        await googleDrive.writeFile(updatedConfig.fileId, file);

        this.imgstorConfig = updatedConfig;
        this.emit("ConfigChanged", { detail: { config: updatedConfig } });

        return updatedConfig;

    }

    public get config(): ImgstorConfig {
        return { ...this.imgstorConfig };
    }

    public display(display: boolean) {
        this.emit("DisplayChanged", { detail: { display } });
    }
}