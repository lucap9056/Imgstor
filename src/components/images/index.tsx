/**
 * 主要圖片顯示
 */
import React, { useEffect, useRef, useState } from 'react';
import cookies from "js-cookie";

import { ImgstorEvent, SearchContent, useImgstor } from 'services/imgstor';
import { ImgstorImage, ImgstorImageSort as Sort } from 'services/imgstor-db';

import ImageComponenet from './image';

import styles from "components/images/style.module.scss";
import { useLoader } from 'global-components/loader';

const enum SEARCH {
    LIMIT = 30
}

const enum IMAGE {
    BASE_WIDTH = 160
}

const GetColumnCount = (containerWidth: number) => {
    return Math.floor(containerWidth / IMAGE.BASE_WIDTH);
}

const Images: React.FC = () => {
    const loader = useLoader();
    const imgstor = useImgstor();
    const container = useRef<HTMLDivElement>(null);
    const [images, SetImages] = useState<ImgstorImage[]>([]);
    const [searchContent, SetSearchContent] = useState<SearchContent>({
        title: "",
        tags: [],
        sort: cookies.get("sort") as Sort || ImgstorImage.SORT.DEFAULT
    });
    const [latestUpload, SetLatestUpload] = useState(0);
    const [searchOffset, SetSearchOffset] = useState(0);
    const [hasMoreImages, SetHasMoreImages] = useState(false);
    const [columnCount, SetColumnCount] = useState(5);
    const [shouldRender, SetShouldRender] = useState(false);
    const resizeTimeoutId = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const { title, sort } = searchContent;

        const tags = searchContent.tags.map((t) => t.tagId);

        const loading = loader.append();

        try {
            const searchResult = imgstor.db.SearchImages({
                include: ["imageId", "title", "width", "height", "imageUrl", "previewUrl", "hostingServiceId"], tags, sort,
                filters: (title === "") ? undefined : { title },
                limit: SEARCH.LIMIT,
                offset: searchOffset,
            });

            const newImages = (searchOffset === 0) ? searchResult : [...images, ...searchResult];
            SetHasMoreImages(newImages.length % SEARCH.LIMIT !== 0);
            SetImages(newImages);
        }
        catch (err) {
            console.error(err);
            SetHasMoreImages(false);
            SetImages([]);
        }

        loading.remove();

    }, [searchContent, searchOffset, latestUpload]);

    useEffect(() => {
        const ImageSearchChangedHandler = (e: ImgstorEvent<"ImageSearchChanged">) => {
            SetSearchContent(e.detail);
            SetSearchOffset(0);
        };

        const ImageUpdatedHandler = () => {
            const t = new Date().getTime();
            SetLatestUpload(t);
            SetSearchOffset(0);
        }

        const RenderColumn = () => {
            if (container.current) {
                const containerWidth = container.current.clientWidth;
                SetColumnCount(GetColumnCount(containerWidth));
                SetShouldRender(true);
            }
        };

        const WindowResizeHandler = () => {
            SetShouldRender(false);

            if (resizeTimeoutId.current) {
                clearTimeout(resizeTimeoutId.current);
            }

            resizeTimeoutId.current = setTimeout(RenderColumn, 300);
        };

        RenderColumn();

        imgstor.db.on("ImageUpdated", ImageUpdatedHandler);
        imgstor.on("ImageSearchChanged", ImageSearchChangedHandler);
        window.addEventListener("resize", WindowResizeHandler);

        return () => {
            imgstor.db.off("ImageUpdated", ImageUpdatedHandler);
            imgstor.off("ImageSearchChanged", ImageSearchChangedHandler);
            window.removeEventListener("resize", WindowResizeHandler);
        }
    }, []);


    const HandleLoadMoreIamges = () => {
        SetSearchOffset(searchOffset + images.length);
    }

    return <>
        <div ref={container} className={styles.container}>

            <style>
                {`
                :root {
                    --image-column-count:${columnCount};
                }`}
            </style>

            <div className={styles.images}>
                {shouldRender && images.map(
                    (image, i, images) => {
                        const onload = (hasMoreImages && i + 1 === images.length) ? HandleLoadMoreIamges : undefined;
                        return <ImageComponenet key={image.imageId + image.title} image={image} onload={onload} />;
                    }
                )}
            </div>
        </div>
    </>
}

export default Images;