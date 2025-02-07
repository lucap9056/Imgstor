import { Database } from "sql.js";


export interface ImgstorHostingService {
    id: string
    name: string
}

export class ImgstorHostingService {
    private static readonly empty: ImgstorHostingService = {
        id: "",
        name: ""
    }
    public static get Empty(): ImgstorHostingService {
        return Object.assign({}, ImgstorHostingService.empty);
    }
}

const TABLE_NAME = "HostingService";
const CREATE_CMD = `
CREATE TABLE ${TABLE_NAME} (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
);
`;

function Get(db: Database, ...include: (keyof ImgstorHostingService)[]): ImgstorHostingService[] {
    const columns = include.length > 0 ? include.join(",") : "*";
    const query = `SELECT ${columns} FROM ${TABLE_NAME}`;

    const hostingServices: ImgstorHostingService[] = [];

    const result = db.exec(query);

    if (result.length === 0) return hostingServices;

    const columnNames = result[0].columns;

    return result[0].values.map((row) => {
        const hostingService = ImgstorHostingService.Empty;

        columnNames.forEach((colName, index) => {
            hostingService[colName as keyof ImgstorHostingService] = (row[index] || "").toString();
        });

        return hostingService;
    });
}

function Insert(db: Database, name: string): void {
    const stmt = db.prepare(`INSERT INTO ${TABLE_NAME} (name) VALUES (?)`)
    stmt.run([name]);
    stmt.free();
}

function Update(db: Database, hostingService: ImgstorHostingService): void {
    const { id, name } = hostingService;
    const columnsToUpdate = "name = ?";
    const stmt = db.prepare(`UPDATE ${TABLE_NAME} SET ${columnsToUpdate} WHERE id = ?`);

    stmt.run([name, id]);
    stmt.free();
}

function Delete(db: Database, id: string): void {
    const stmt = db.prepare(`DELETE FROM ${TABLE_NAME} WHERE id=?`)
    stmt.run([id]);
    stmt.free();
}

export default {
    Get,
    Insert,
    Update,
    Delete,
    TABLE_NAME,
    CREATE_CMD,
}