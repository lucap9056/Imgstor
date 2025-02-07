use crate::frames::Frames;
use image::{codecs::webp::WebPDecoder, AnimationDecoder};
//use js_sys::Uint8Array;
use std::io::Cursor;
use wasm_bindgen::JsError;
//use webp::{AnimEncoder, AnimFrame};

pub fn decode_webp(image_data: &[u8]) -> Result<Frames, JsError> {
    let decoder = WebPDecoder::new(Cursor::new(image_data))?;

    let mut frames: Frames = Vec::new();

    for frame_data in decoder.into_frames() {
        let frame_data = frame_data.map_err(|e| JsError::new(&e.to_string()))?;
        let delay = frame_data.delay().numer_denom_ms().0;
        let image = Box::new(frame_data.into_buffer());

        frames.push((image, delay));
    }

    Ok(frames)
}
/*
pub fn encode_webp(frames: Frames) -> Result<Uint8Array, JsError> {
    let config = webp::WebPConfig::new().map_err(|_| JsError::new(""))?;

    let first = frames[0].clone();
    let width = first.0.width();
    let height = first.0.height();

    let mut encoder = AnimEncoder::new(width, height, &config);

    for (image, delay) in &frames {
        let data = image.as_ref();

        let frame = AnimFrame::from_rgba(data, width, height, (*delay) as i32);
        encoder.add_frame(frame);
    }

    let webp = encoder.encode();

    Ok(Uint8Array::from(webp.to_vec().as_slice()))
}
*/