/**
 * Google操作函數
 */
import { gapi } from "gapi-script";
import EventDispatcher from "structs/event-dispatcher";

export class NotSignedInError extends Error {
    public authInstance: gapi.auth2.GoogleAuth;
    constructor(authInstance: gapi.auth2.GoogleAuth, message: string = "User is not signed in.") {
        super(message);
        this.authInstance = authInstance;
        this.name = "NotSignedInError";
    }
}

type GoogleEventDefinitions = {
    "StatusChanged": { detail: { signedIn: boolean } };
    "ErrorOccurred": { detail: { message: string, error: Error } };
};
export type GoogleEvent<T extends keyof GoogleEventDefinitions> = GoogleEventDefinitions[T];


export default class Google extends EventDispatcher<GoogleEventDefinitions> {
    private googleDrive: Drive;
    private static k = process.env.VITE_GOOGLE_API_KEY;
    private static c = process.env.VITE_GOOGLE_CLIENT_ID;

    public static new = async function (): Promise<Google> {
        const config = {
            clientId: Google.c,
            discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"],
            scope: "https://www.googleapis.com/auth/drive.appdata"
        };

        return new Promise((resolve, reject) => {
            gapi.load('client:auth2', () => {
                gapi.client.init(config).then(() => {

                    if (!Google.k) {
                        return reject(new Error("Google api key is empty"));
                    }

                    gapi.client.setApiKey(Google.k);
                    const authInstance = gapi.auth2.getAuthInstance();

                    const signedIn = authInstance.isSignedIn.get();

                    if (signedIn) {
                        Drive.new().then((drive) => {

                            const google = new Google(authInstance, drive);
                            resolve(google);

                        }).catch(reject);
                    } else {
                        reject(new NotSignedInError(authInstance));
                    }

                }).catch(reject);
            });
        });
    }

    public static signIn = function (authInstance: gapi.auth2.GoogleAuth): Promise<Google> {

        return new Promise((resolve, reject) => {
            authInstance.signIn().then(async () => {
                const drive = await Drive.new();

                const google = new Google(authInstance, drive);

                resolve(google);

            }).catch(reject);

        });

    }

    constructor(authInstance: gapi.auth2.GoogleAuth, drive: Drive) {
        super();

        this.googleDrive = drive;

        this.emit("StatusChanged", { detail: { signedIn: true } });

        authInstance.isSignedIn.listen((signedIn: boolean) => {
            this.emit("StatusChanged", { detail: { signedIn } });
        });

        authInstance.currentUser.listen((user) => {
            if (user.isSignedIn()) {
                this.emit("StatusChanged", { detail: { signedIn: true } });
            } else {
                this.emit("StatusChanged", { detail: { signedIn: false } });
            }
        });

    }

    public get drive(): Drive {
        return this.googleDrive;
    }

    public get signedIn(): boolean {
        return gapi.auth2.getAuthInstance().isSignedIn.get();
    }

    public signOut() {
        console.log("signout");
        const authInstance = gapi.auth2.getAuthInstance();
        if (authInstance.isSignedIn.get()) {
            authInstance.signOut().then(() => {
                console.log("User signed out successfully");
            }).catch((error: Error) => {
                console.error("Error during sign-out: ", error);
            });
        }
    }
}

type AppRoot = gapi.client.drive.File & { id: string }

export class Drive {
    public static readonly AppName: string = process.env.VITE_APP_NAME || "";
    private appRoot: AppRoot;

    public static new = async function (): Promise<Drive> {
        if (Drive.AppName === "") {
            throw new Error("APP_NAME cannot be empty.");
        }

        const q = `'appDataFolder' in parents and name = '${Drive.AppName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;

        const files: gapi.client.drive.File[] | undefined = await gapi.client.drive.files.list({
            spaces: 'appDataFolder',
            pageSize: 10,
            fields: 'nextPageToken, files(id, name, mimeType, parents, webViewLink, iconLink)',
            q: q
        }).then((res) => res.result.files);

        if (files === undefined || files.length === 0) {

            const root: gapi.client.drive.File = await gapi.client.drive.files.create({
                resource: {
                    name: Drive.AppName,
                    mimeType: 'application/vnd.google-apps.folder',
                    parents: ['appDataFolder']
                },
                fields: "id, name, mimeType, parents, webViewLink, iconLink",
            }).then((res) => res.result);

            return new Drive(root);
        }

        return new Drive(files[0]);
    }

    constructor(appRoot: gapi.client.drive.File) {
        const id = appRoot.id;
        if (!id) {
            throw new Error("");
        }

        this.appRoot = { ...appRoot, id };
    }

    public async searchFiles(parentIds: string[], ...filesName: string[]): Promise<gapi.client.drive.FileList> {
        if (parentIds.length === 0) {
            parentIds.push(this.appRoot.id);
        }

        let parents = `('${parentIds.join("' in parents or '")}' in parents )`;
        let files = "";

        if (filesName.length > 0) {
            files = ` and ( name = '${filesName.join("' of name = '")}' )`;
        }

        const q = `${parents}${files} and trashed = false`;

        try {
            const response = await gapi.client.drive.files.list({
                spaces: 'appDataFolder',
                pageSize: 10,
                fields: 'nextPageToken, files(id, name, mimeType, parents, webViewLink, iconLink)',
                q: q,
            });
            return response.result;
        } catch (error) {
            throw new Error("Error fetching files: " + (error as Error).message);
        }
    }


    public async readFile(fileId: string): Promise<string> {
        return await gapi.client.drive.files.get({ fileId, alt: 'media' })
            .then((res) => res.body);
    }

    public async writeFile(fileId: string, file: File): Promise<void> {
        const content = await file.arrayBuffer();

        await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media&mimeType=${file.type}`, {
            method: "PATCH",
            headers: {
                "Authorization": `Bearer ${gapi.client.getToken().access_token}`,
            },
            body: content
        });

    }

    public async createFile(name: string, mimeType: string, parentId?: string): Promise<gapi.client.drive.File> {
        if (parentId === undefined) {
            parentId = this.appRoot.id;
        }

        if (parentId === undefined) {
            throw new Error();
        }

        return await gapi.client.drive.files.create({
            resource: { name, mimeType, parents: [parentId] }
        }).then((res) => res.result);
    }

    public async createFolder(folderName: string, parentId?: string): Promise<gapi.client.drive.File> {
        if (parentId === undefined) {
            parentId = this.appRoot.id;
        }

        if (parentId === undefined) {
            throw new Error();
        }

        return await gapi.client.drive.files.create({
            resource: {
                name: folderName,
                mimeType: 'application/vnd.google-apps.folder',
                parents: [parentId]
            },
            fields: "id, name, mimeType, parents, webViewLink, iconLink",
        }).then((res) => res.result);
    }

    public async deleteFile(fileId: string): Promise<void> {
        await gapi.client.drive.files.delete({ fileId });
    }

    public async using(): Promise<number> {

        const response = await gapi.client.drive.files.list({
            spaces: 'appDataFolder',
            pageSize: 10,
            fields: 'nextPageToken, files(id, name, size)',
            q: `'${this.appRoot.id}' in parents and trashed = false`,
        });

        let totalSize = 0;
        for (const file of response.result.files || []) {
            totalSize += parseInt(file.size || "0");
        }

        return totalSize;

    }

    public async clear(): Promise<void> {

        await gapi.client.drive.files.delete({
            fileId: this.appRoot.id,
        });
        console.log(`Files deleted.`);

    }

}
