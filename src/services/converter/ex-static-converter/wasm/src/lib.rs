mod image_decode;

use image::{ExtendedColorType, ImageEncoder, RgbaImage};
use image_decode::decode_psd;
use js_sys::Uint8Array;
use wasm_bindgen::prelude::*;

#[wasm_bindgen(js_name = "WasmConvertImage")]
pub fn convert_image(image_data: &[u8], source_type: &str) -> Result<Uint8Array, JsError> {
    let bitmap = match source_type.to_lowercase().as_str() {
        "psd" => decode_psd(image_data),
        _ => Err(JsError::new(&format!(
            "Not support source type: {}",
            source_type
        ))),
    }?;

    encode_image(bitmap)
}

pub fn encode_image(bitmap: (u32, u32, Vec<u8>)) -> Result<Uint8Array, JsError> {
    let (width, height, data) = bitmap;
    let img = RgbaImage::from_raw(width, height, data)
        .ok_or_else(|| JsError::new("Failed to create RgbaImage from BitmapResult"))?;

    let mut output = Vec::new();
    let encoder = image::codecs::png::PngEncoder::new(&mut output);
    encoder.write_image(&img, width, height, ExtendedColorType::Rgba8)?;

    Ok(Uint8Array::from(output.as_slice()))
}
