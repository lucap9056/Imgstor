use psd::Psd;
use wasm_bindgen::JsError;

pub fn decode_psd(image_data: &[u8]) -> Result<(u32, u32, Vec<u8>), JsError> {
    let psd = Psd::from_bytes(image_data)
        .map_err(|e| JsError::new(&format!("Failed to parse PSD: {}", e)))?;

    let width = psd.width();
    let height = psd.height();
    let data = psd.rgba();

    Ok((width, height, data))
}
