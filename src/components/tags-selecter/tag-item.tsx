import React from "react";
import { ImgstorTag } from "services/imgstor-db";

interface Props {
    className: string
    tag: ImgstorTag
    ondrag: (tag: ImgstorTag) => void
    onclick: (tag: ImgstorTag) => void
}

const TagItem: React.FC<Props> = ({ className, tag, ondrag, onclick }) => {

    const HandleDrag = () => {
        ondrag(tag);
    }

    const HandleClick = () => {
        onclick(tag);
    }

    return <div className={className}
        onTouchStart={HandleDrag}
        onMouseDown={HandleDrag}
        onClick={HandleClick}
    >
        {tag.name}
    </div>;
}

export default TagItem;