import { gapi } from "gapi-script";
import EventDispatcher from "structs/event-dispatcher";

export class NotSignedInError extends Error {
  constructor(message: string = "User is not signed in.") {
    super(message);
    this.name = "NotSignedInError";
  }
}

type GoogleEventDefinitions = {
  StatusChanged: { signedIn: boolean };
  ErrorOccurred: { message: string; error: Error };
};
export type GoogleEvent<T extends keyof GoogleEventDefinitions> = CustomEvent<
  GoogleEventDefinitions[T]
>;

const SCOPE = "https://www.googleapis.com/auth/drive.appdata";
const GAPI_LOAD_TIMEOUT_MS = 10000;
const REFRESH_MARGIN_SECONDS = 60;

const CLIENT_ID = process.env.VITE_GOOGLE_CLIENT_ID;

function LoadGapiClient(): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error("Failed to load Google API client (timed out)."));
    }, GAPI_LOAD_TIMEOUT_MS);

    gapi.load("client", () => {
      clearTimeout(timeoutId);
      resolve();
    });
  });
}

function RequestAccessToken(
  prompt: "" | "consent",
): Promise<google.accounts.oauth2.TokenResponse> {
  return new Promise((resolve, reject) => {
    if (!CLIENT_ID) {
      reject(new Error("Google client ID is empty"));
      return;
    }

    const tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      callback: (response) => {
        if (response.error) {
          reject(new Error(response.error_description || response.error));
          return;
        }
        resolve(response);
      },
      error_callback: (error) => {
        reject(new Error(error.message || error.type));
      },
    });

    tokenClient.requestAccessToken({ prompt });
  });
}

function SetGapiToken(accessToken: string): void {
  gapi.client.setToken({ access_token: accessToken });
}

async function EnsureDriveApiLoaded(): Promise<void> {
  if (gapi.client.drive) return;

  await gapi.client.load("drive", "v3");

  if (!gapi.client.drive) {
    throw new Error("Failed to load the Google Drive API client.");
  }
}

export default class Google extends EventDispatcher<GoogleEventDefinitions> {
  private googleDrive: Drive;
  private accessToken: string;
  private refreshTimeoutId?: ReturnType<typeof setTimeout>;

  public static new = async (): Promise<Google> => {
    await LoadGapiClient();

    await gapi.client.init({});
    await EnsureDriveApiLoaded();

    let response: google.accounts.oauth2.TokenResponse;
    try {
      response = await RequestAccessToken("");
    } catch {
      throw new NotSignedInError();
    }

    SetGapiToken(response.access_token);
    const drive = await Drive.new();

    return new Google(response, drive);
  };

  public static signIn = async (): Promise<Google> => {
    const response = await RequestAccessToken("consent");

    SetGapiToken(response.access_token);
    await EnsureDriveApiLoaded();
    const drive = await Drive.new();

    return new Google(response, drive);
  };

  constructor(response: google.accounts.oauth2.TokenResponse, drive: Drive) {
    super();

    this.googleDrive = drive;
    this.accessToken = response.access_token;

    this.scheduleRefresh(response.expires_in);
    this.emit("StatusChanged", { signedIn: true });
  }

  private scheduleRefresh(expiresInSeconds: number): void {
    if (this.refreshTimeoutId) {
      clearTimeout(this.refreshTimeoutId);
    }

    const refreshInMs =
      Math.max(expiresInSeconds - REFRESH_MARGIN_SECONDS, 30) * 1000;

    this.refreshTimeoutId = setTimeout(async () => {
      try {
        const response = await RequestAccessToken("");
        this.accessToken = response.access_token;
        SetGapiToken(response.access_token);
        this.scheduleRefresh(response.expires_in);
      } catch {
        this.emit("StatusChanged", { signedIn: false });
      }
    }, refreshInMs);
  }

  public get drive(): Drive {
    return this.googleDrive;
  }

  public get signedIn(): boolean {
    return this.accessToken !== "";
  }

  public signOut(): void {
    const { accessToken } = this;

    if (this.refreshTimeoutId) {
      clearTimeout(this.refreshTimeoutId);
    }
    this.accessToken = "";

    if (!accessToken) {
      this.emit("StatusChanged", { signedIn: false });
      return;
    }

    google.accounts.oauth2.revoke(accessToken, () => {
      this.emit("StatusChanged", { signedIn: false });
    });
  }
}

type AppRoot = gapi.client.drive.File & { id: string };

export class Drive {
  public static readonly AppName: string = process.env.VITE_APP_NAME || "";
  private appRoot: AppRoot;

  public static new = async (): Promise<Drive> => {
    if (Drive.AppName === "") {
      throw new Error("APP_NAME cannot be empty.");
    }

    const q = `'appDataFolder' in parents and name = '${Drive.AppName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;

    const files: gapi.client.drive.File[] | undefined =
      await gapi.client.drive.files
        .list({
          spaces: "appDataFolder",
          pageSize: 10,
          fields:
            "nextPageToken, files(id, name, mimeType, parents, webViewLink, iconLink)",
          q: q,
        })
        .then((res) => res.result.files);

    if (files === undefined || files.length === 0) {
      const root: gapi.client.drive.File = await gapi.client.drive.files
        .create({
          resource: {
            name: Drive.AppName,
            mimeType: "application/vnd.google-apps.folder",
            parents: ["appDataFolder"],
          },
          fields: "id, name, mimeType, parents, webViewLink, iconLink",
        })
        .then((res) => res.result);

      return new Drive(root);
    }

    return new Drive(files[0]);
  };

  constructor(appRoot: gapi.client.drive.File) {
    const id = appRoot.id;
    if (!id) {
      throw new Error("");
    }

    this.appRoot = { ...appRoot, id };
  }

  public async searchFiles(
    parentIds: string[],
    ...filesName: string[]
  ): Promise<gapi.client.drive.FileList> {
    if (parentIds.length === 0) {
      parentIds.push(this.appRoot.id);
    }

    const parents = `('${parentIds.join("' in parents or '")}' in parents )`;
    let files = "";

    if (filesName.length > 0) {
      files = ` and ( name = '${filesName.join("' of name = '")}' )`;
    }

    const q = `${parents}${files} and trashed = false`;

    try {
      const response = await gapi.client.drive.files.list({
        spaces: "appDataFolder",
        pageSize: 10,
        fields:
          "nextPageToken, files(id, name, mimeType, parents, webViewLink, iconLink)",
        q: q,
      });
      return response.result;
    } catch (error) {
      throw new Error(`Error fetching files: ${(error as Error).message}`);
    }
  }

  public async readFile(fileId: string): Promise<string> {
    return await gapi.client.drive.files
      .get({ fileId, alt: "media" })
      .then((res) => res.body);
  }

  public async writeFile(fileId: string, file: File): Promise<void> {
    const content = await file.arrayBuffer();

    await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media&mimeType=${file.type}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${gapi.client.getToken().access_token}`,
        },
        body: content,
      },
    );
  }

  public async createFile(
    name: string,
    mimeType: string,
    parentId?: string,
  ): Promise<gapi.client.drive.File> {
    if (parentId === undefined) {
      parentId = this.appRoot.id;
    }

    if (parentId === undefined) {
      throw new Error();
    }

    return await gapi.client.drive.files
      .create({
        resource: { name, mimeType, parents: [parentId] },
      })
      .then((res) => res.result);
  }

  public async createFolder(
    folderName: string,
    parentId?: string,
  ): Promise<gapi.client.drive.File> {
    if (parentId === undefined) {
      parentId = this.appRoot.id;
    }

    if (parentId === undefined) {
      throw new Error();
    }

    return await gapi.client.drive.files
      .create({
        resource: {
          name: folderName,
          mimeType: "application/vnd.google-apps.folder",
          parents: [parentId],
        },
        fields: "id, name, mimeType, parents, webViewLink, iconLink",
      })
      .then((res) => res.result);
  }

  public async deleteFile(fileId: string): Promise<void> {
    await gapi.client.drive.files.delete({ fileId });
  }

  public async using(): Promise<number> {
    const response = await gapi.client.drive.files.list({
      spaces: "appDataFolder",
      pageSize: 10,
      fields: "nextPageToken, files(id, name, size)",
      q: `'${this.appRoot.id}' in parents and trashed = false`,
    });

    let totalSize = 0;
    for (const file of response.result.files || []) {
      totalSize += parseInt(file.size || "0", 10);
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
