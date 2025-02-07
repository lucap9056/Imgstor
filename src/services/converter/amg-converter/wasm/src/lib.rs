mod apng;
mod frames;
mod gif;
mod webp;
use apng::{decode_apng, encode_apng};
use gif::{decode_gif, encode_gif};
use js_sys::Uint8Array;
use wasm_bindgen::prelude::*;
use webp::{decode_webp /*encode_webp*/};

#[wasm_bindgen(js_name = "WasmConvertAnimationImage")]
pub fn decode(
    image_data: &[u8],
    source_format: &str,
    target_format: &str,
) -> Result<Uint8Array, JsError> {
    let image = match source_format.to_lowercase().as_str() {
        "gif" => decode_gif(image_data),
        "webp" => decode_webp(image_data),
        "apng" => decode_apng(image_data),
        _ => Err(JsError::new(&format!(
            "Not support source format: {}",
            source_format
        ))),
    }?;

    match target_format.to_lowercase().as_str() {
        "gif" => encode_gif(image),
        //"webp" => encode_webp(image),
        "apng" => encode_apng(image),
        _ => Err(JsError::new(&format!(
            "Not support targe format: {}",
            source_format
        ))),
    }
}
