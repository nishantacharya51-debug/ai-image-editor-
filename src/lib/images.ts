import { assetUrl } from "./paths";
export async function decodeImage(file: Blob) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("Please choose a JPEG, PNG, or WebP image.");
  if (file.size > 30 * 1024 * 1024)
    throw new Error("This file is too large. The limit is 30 MB.");
  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const jpeg = header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
  const png = [137, 80, 78, 71, 13, 10, 26, 10].every(
    (byte, i) => header[i] === byte,
  );
  const webp =
    String.fromCharCode(...header.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...header.slice(8, 12)) === "WEBP";
  if (!jpeg && !png && !webp)
    throw new Error(
      "This image could not be decoded. Its contents are not a supported image format.",
    );
  let image: ImageBitmap;
  try {
    image = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("This image could not be decoded. Try a different file.");
  }
  if (image.width * image.height > 40_000_000) {
    image.close();
    throw new Error(
      "Please use a photo below 40 megapixels to protect browser memory.",
    );
  }
  return image;
}
export async function sampleBlob() {
  const response = await fetch(assetUrl("images/alpine.jpg"));
  if (!response.ok) throw new Error("Example image could not load.");
  return response.blob();
}
