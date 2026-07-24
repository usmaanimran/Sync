export const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

export default async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number },
  cropType: 'avatar' | 'banner' | 'post' // <-- New parameter to determine compression scale
): Promise<File | null> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) return null;

  // 1. Determine maximum dimensions based on the target
  const MAX_WIDTH = cropType === 'avatar' ? 400 : 1080;
  
  // 2. Calculate the scaling factor to maintain aspect ratio
  let scale = 1;
  if (pixelCrop.width > MAX_WIDTH) {
    scale = MAX_WIDTH / pixelCrop.width;
  }

  // 3. Set the canvas to the new optimized dimensions
  const finalWidth = Math.floor(pixelCrop.width * scale);
  const finalHeight = Math.floor(pixelCrop.height * scale);
  
  canvas.width = finalWidth;
  canvas.height = finalHeight;

  // 4. Draw the cropped and scaled image onto the canvas
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    finalWidth,
    finalHeight
  );

  // 5. Output natively as WebP at 80% quality (The Squeezer)
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) return resolve(null);
      // Generate a unique client-side hash for the filename
      const hash = Math.random().toString(36).substring(2, 10);
      const file = new File([blob], `${cropType}_${hash}.webp`, { type: 'image/webp' });
      resolve(file);
    }, 'image/webp', 0.8);
  });
}