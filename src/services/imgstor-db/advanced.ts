import { Database } from "sql.js";
import Image, { ImgstorImage, ImgstorImageSort } from "services/imgstor-db/image";
import ImageTag from "services/imgstor-db/image-tag";

export interface SearchImagesArgs {
    include?: (keyof ImgstorImage)[]
    tags?: string[]
    sort?: ImgstorImageSort
    filters?: Partial<Record<keyof ImgstorImage, string>>
    limit?: number
    offset?: number
}

function SearchImages(db: Database, args: SearchImagesArgs = {}): ImgstorImage[] {
    const {
        include = [],
        tags = [],
        sort = ImgstorImage.SORT.DEFAULT,
        filters = {},
        limit,
        offset,
    } = args;

    const columns = include.length > 0 ? include.map((i) => "i." + i).join(",") : "i.*";

    const params: string[] = [...tags];

    let query = `SELECT ${columns} FROM ${Image.TABLE_NAME} i`;

    if (tags.length > 0) {
        const tagPlaceholders = tags.map(() => "?").join(", ");
        const count = tags.length
        query += ` JOIN ${ImageTag.TABLE_NAME} it ON it.${ImageTag.COLUMNS.image} = i.${Image.COLUMNS.imageId}
                       WHERE it.${ImageTag.COLUMNS.tag} IN (${tagPlaceholders})
                       GROUP BY i.${Image.COLUMNS.imageId} HAVING COUNT(DISTINCT it.${ImageTag.COLUMNS.tag}) = ${count}`;
    }

    const validFilters = Object.entries(filters).filter(([_, value]) => value !== undefined);

    const filterQuery = validFilters.map(([field, value]) => {
        switch (field) {
            case Image.COLUMNS.title:
                params.push(`%${value.replace(/%/g, '\\%')}%`);
                return field + " LIKE ? ESCAPE '\\'";
            default:
                params.push(value);
                return field + " = ?"
        }
    }).join(" AND ");

    if (filterQuery !== "") {
        query += (tags.length > 0) ? " AND" : " WHERE";
        query += " " + filterQuery;
    }

    switch (sort) {
        case ImgstorImage.SORT.NEWEST:
            query += ` ORDER BY i.${Image.COLUMNS.createTime} DESC`;
            break;
        case ImgstorImage.SORT.OLDEST:
            query += ` ORDER BY i.${Image.COLUMNS.createTime} ASC`;
            break;
    }

    if (limit !== undefined) {
        query += " LIMIT ?";
        params.push(limit.toString());
    }

    if (offset !== undefined) {
        query += " OFFSET ?";
        params.push(offset.toString());
    }


    const images: ImgstorImage[] = [];

    const result = db.exec(query, params);

    if (result.length === 0) return images;

    const columnNames = result[0].columns;

    for (const row of result[0].values) {
        const image: ImgstorImage = ImgstorImage.Empty;

        columnNames.forEach((colName, index) => {
            image[colName as keyof ImgstorImage] = (row[index] || "").toString();
        });

        images.push(image);
    }

    return images;
}

export default {
    SearchImages
}