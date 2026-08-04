import EventDispatcher from "structs/event-dispatcher";

type GoogleEventDefinitions = {
  StatusChanged: { signedIn: boolean };
  ErrorOccurred: { message: string; error: Error };
};
export type GoogleEvent<T extends keyof GoogleEventDefinitions> = CustomEvent<
  GoogleEventDefinitions[T]
>;

const SCOPE = "https://www.googleapis.com/auth/drive.appdata";
const SIGN_OUT_TIMEOUT_MS = 5000;
const REFRESH_MARGIN_SECONDS = 60;

const CLIENT_ID = process.env.VITE_GOOGLE_CLIENT_ID;

let currentAccessToken = "";

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

export default class Google extends EventDispatcher<GoogleEventDefinitions> {
  private googleDrive: Drive;
  private accessToken: string;
  private refreshTimeoutId?: ReturnType<typeof setTimeout>;

  public static signIn = async (): Promise<Google> => {
    let response: google.accounts.oauth2.TokenResponse;
    try {
      response = await RequestAccessToken("");
    } catch {
      response = await RequestAccessToken("consent");
    }

    currentAccessToken = response.access_token;
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
        currentAccessToken = response.access_token;
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

  public signOut(): Promise<void> {
    const { accessToken } = this;

    if (this.refreshTimeoutId) {
      clearTimeout(this.refreshTimeoutId);
    }
    this.accessToken = "";
    currentAccessToken = "";

    if (!accessToken) {
      this.emit("StatusChanged", { signedIn: false });
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        this.emit("StatusChanged", { signedIn: false });
        resolve();
      }, SIGN_OUT_TIMEOUT_MS);

      google.accounts.oauth2.revoke(accessToken, () => {
        clearTimeout(timeoutId);
        this.emit("StatusChanged", { signedIn: false });
        resolve();
      });
    });
  }
}

export interface DriveFile {
  id: string;
  name?: string;
  mimeType?: string;
  parents?: string[];
  webViewLink?: string;
  iconLink?: string;
  size?: string;
}

export interface DriveFileList {
  files?: DriveFile[];
}

const DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_BASE = "https://www.googleapis.com/upload/drive/v3";
const DRIVE_FILE_FIELDS = "id, name, mimeType, parents, webViewLink, iconLink";

function DriveAuthHeaders(): HeadersInit {
  return { Authorization: `Bearer ${currentAccessToken}` };
}

async function DriveFetch(path: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(`${DRIVE_API_BASE}${path}`, {
    ...init,
    headers: { ...DriveAuthHeaders(), ...init?.headers },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Drive API request failed (${response.status}): ${body}`);
  }

  return response;
}

async function DriveFetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  return (await DriveFetch(path, init)).json();
}

async function ListFiles(
  query: string,
  fields: string,
): Promise<DriveFileList> {
  const params = new URLSearchParams({
    spaces: "appDataFolder",
    pageSize: "10",
    fields: `nextPageToken, files(${fields})`,
    q: query,
  });

  return DriveFetchJson<DriveFileList>(`/files?${params}`);
}

async function CreateFile(
  metadata: { name: string; mimeType: string; parents: string[] },
  fields?: string,
): Promise<DriveFile> {
  const params = fields ? `?${new URLSearchParams({ fields })}` : "";

  return DriveFetchJson<DriveFile>(`/files${params}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(metadata),
  });
}

export class Drive {
  public static readonly AppName: string = process.env.VITE_APP_NAME || "";
  private appRoot: DriveFile;

  public static new = async (): Promise<Drive> => {
    if (Drive.AppName === "") {
      throw new Error("APP_NAME cannot be empty.");
    }

    const q = `'appDataFolder' in parents and name = '${Drive.AppName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;

    const { files } = await ListFiles(q, DRIVE_FILE_FIELDS);

    if (files === undefined || files.length === 0) {
      const root = await CreateFile(
        {
          name: Drive.AppName,
          mimeType: "application/vnd.google-apps.folder",
          parents: ["appDataFolder"],
        },
        DRIVE_FILE_FIELDS,
      );

      return new Drive(root);
    }

    return new Drive(files[0]);
  };

  constructor(appRoot: DriveFile) {
    if (!appRoot.id) {
      throw new Error("Drive app root folder has no ID.");
    }

    this.appRoot = appRoot;
  }

  public async searchFiles(
    parentIds: string[],
    ...filesName: string[]
  ): Promise<DriveFileList> {
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
      return await ListFiles(q, DRIVE_FILE_FIELDS);
    } catch (error) {
      throw new Error(`Error fetching files: ${(error as Error).message}`);
    }
  }

  public async readFile(fileId: string): Promise<string> {
    return (await DriveFetch(`/files/${fileId}?alt=media`)).text();
  }

  public async readFileBuffer(fileId: string): Promise<ArrayBuffer> {
    return (await DriveFetch(`/files/${fileId}?alt=media`)).arrayBuffer();
  }

  public async writeFile(fileId: string, file: File): Promise<void> {
    const content = await file.arrayBuffer();

    await fetch(
      `${DRIVE_UPLOAD_BASE}/files/${fileId}?uploadType=media&mimeType=${file.type}`,
      {
        method: "PATCH",
        headers: DriveAuthHeaders(),
        body: content,
      },
    );
  }

  public async createFile(
    name: string,
    mimeType: string,
    parentId?: string,
  ): Promise<DriveFile> {
    if (parentId === undefined) {
      parentId = this.appRoot.id;
    }

    if (parentId === undefined) {
      throw new Error("createFile: no parentId given and app root has no ID.");
    }

    return CreateFile({ name, mimeType, parents: [parentId] });
  }

  public async createFolder(
    folderName: string,
    parentId?: string,
  ): Promise<DriveFile> {
    if (parentId === undefined) {
      parentId = this.appRoot.id;
    }

    if (parentId === undefined) {
      throw new Error(
        "createFolder: no parentId given and app root has no ID.",
      );
    }

    return CreateFile(
      {
        name: folderName,
        mimeType: "application/vnd.google-apps.folder",
        parents: [parentId],
      },
      DRIVE_FILE_FIELDS,
    );
  }

  public async deleteFile(fileId: string): Promise<void> {
    await DriveFetch(`/files/${fileId}`, { method: "DELETE" });
  }

  public async using(): Promise<number> {
    const { files } = await ListFiles(
      `'${this.appRoot.id}' in parents and trashed = false`,
      "id, name, size",
    );

    let totalSize = 0;
    for (const file of files || []) {
      totalSize += parseInt(file.size || "0", 10);
    }

    return totalSize;
  }

  public async clear(): Promise<void> {
    await DriveFetch(`/files/${this.appRoot.id}`, { method: "DELETE" });
    console.log(`Files deleted.`);
  }
}
