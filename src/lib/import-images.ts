const DEFAULT_MAX_DIMENSION = 1800
const DEFAULT_QUALITY = 0.78
const DEFAULT_MAX_ORIGINAL_BYTES = 2.5 * 1024 * 1024

type NormalizeImportImageOptions = {
  maxDimension?: number
  quality?: number
  maxOriginalBytes?: number
}

function fileNameWithoutExtension(name: string) {
  return name.replace(/\.[^.]+$/, '')
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()

    const cleanup = () => {
      URL.revokeObjectURL(url)
      image.onload = null
      image.onerror = null
    }

    image.onload = () => {
      cleanup()
      resolve(image)
    }

    image.onerror = () => {
      cleanup()
      reject(new Error(`Unable to read image '${file.name}'.`))
    }

    image.src = url
  })
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Unable to compress the selected image.'))
        return
      }

      resolve(blob)
    }, type, quality)
  })
}

export async function normalizeImportedImage(file: File, options: NormalizeImportImageOptions = {}) {
  const image = await loadImage(file)
  const maxDimension = options.maxDimension ?? DEFAULT_MAX_DIMENSION
  const quality = options.quality ?? DEFAULT_QUALITY
  const maxOriginalBytes = options.maxOriginalBytes ?? DEFAULT_MAX_ORIGINAL_BYTES
  const longestEdge = Math.max(image.naturalWidth, image.naturalHeight)
  const scale = longestEdge > maxDimension ? maxDimension / longestEdge : 1
  const targetWidth = Math.max(1, Math.round(image.naturalWidth * scale))
  const targetHeight = Math.max(1, Math.round(image.naturalHeight * scale))
  const shouldKeepOriginal = scale === 1 && file.size <= maxOriginalBytes && /^image\/(jpeg|jpg|png|webp)$/i.test(file.type)

  if (shouldKeepOriginal) {
    return file
  }

  const canvas = document.createElement('canvas')
  canvas.width = targetWidth
  canvas.height = targetHeight

  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('Unable to prepare the selected image for upload.')
  }

  context.drawImage(image, 0, 0, targetWidth, targetHeight)

  const blob = await canvasToBlob(canvas, 'image/jpeg', quality)
  const outputName = `${fileNameWithoutExtension(file.name) || 'recipe-import'}.jpg`

  return new File([blob], outputName, {
    type: 'image/jpeg',
    lastModified: Date.now(),
  })
}