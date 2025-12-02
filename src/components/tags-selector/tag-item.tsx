import React from "react";
import { ImgstorTag } from "services/imgstor-db";

interface Props {
    className: string
    tag: ImgstorTag
    ondrag: (tag: ImgstorTag) => void
    onclick: (tag: ImgstorTag) => void
}

const TagItem: React.FC<Props> = ({ className, tag, ondrag, onclick }) => {

    const handleDrag = () => {
        ondrag(tag);
    }

    const handleClick = () => {
        onclick(tag);
    }

    return <div className={className}
        onTouchStart={handleDrag}
        onMouseDown={handleDrag}
        onClick={handleClick}
    >
        {tag.name}
    </div>;
}

export default TagItem;