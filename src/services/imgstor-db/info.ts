import { Database } from "sql.js";

const enum COLUMNS {
    VERSION = "version"
}

interface Info {
    version: string
}

const InfoEmpty: Info = {
    version: ""
};

const TABLE_NAME = "Info";
const VERSION = 1;
const CREATE_CMD = `CREATE TABLE ${TABLE_NAME} (${COLUMNS.VERSION} TEXT PRIMARY KEY);`;
const INSERT_CMD = `INSERT INTO ${TABLE_NAME} (${COLUMNS.VERSION}) VALUES (?)`;

function ensureVersion(db: Database): void {

    const query = `SELECT ${COLUMNS.VERSION} FROM ${TABLE_NAME}`;

    const { columns, values } = db.exec(query)[0];

    const info = { ...InfoEmpty };

    columns.forEach((colName, index) => {
        info[colName as keyof Info] = (values[index] || "").toString();
    });

    const version = parseInt(info.version);

    switch (version) {
        case VERSION:
            return;
        default:
            throw new Error("unknown version");
    }
}

export default {
    VERSION,
    CREATE_CMD,
    INSERT_CMD,
    ensureVersion
}