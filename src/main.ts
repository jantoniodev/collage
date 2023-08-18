import Konva from 'konva'
import backgroundRemoval from '@imgly/background-removal'

const FRAME_WIDTH = 40

const ratio = 0.7
const canvasWidth = 1440 * ratio
const canvasHeight = 900 * ratio

const stage = new Konva.Stage({
    container: 'container',
    width: 1152,
    height: 719,
})

const layer = new Konva.Layer({
    x: (stage.width() / 2) - (canvasWidth / 2),
    y: (stage.height() / 2) - (canvasHeight / 2),
    width: canvasWidth,
    height: canvasHeight,
})
const transformer = new Konva.Transformer()
const background = new Konva.Rect({
    x: 0,
    y: 0,
    width: canvasWidth,
    height: canvasHeight,
    fill: '#8598A9',
    listening: false,
})

layer.add(background)
layer.add(transformer)
stage.add(layer)

// Elimina imagenes seleccionadas cuando se haga click en imagenes vacias
stage.on('click', (event) => {
    if (event.target == stage) {
        transformer.nodes([])
    }
})

const uploadPhotoButton = document.getElementById('upload-fotos')
const uploadObjectButton = document.getElementById('upload-object')
const uploadObjectProgress = document.getElementById('upload-object-progress')
const downloadButton = document.getElementById('download-button')

downloadButton?.addEventListener('click', () => {
    const imageDataUrl = stage.toDataURL({
        mimeType: 'image/jpeg',
        x: layer.x(),
        y: layer.y(),
        width: canvasWidth,
        height: canvasHeight,
        quality: 1,
        /*
            La expresión para pixel ratio se puede simplificar matemáticamente como 1 / ratio
            pero al hacerlo así existe un problema de redondeo en la resolución final con la que se exporta la imágen
            por lo tanto se deja de la forma completa.
        */
        pixelRatio: (canvasWidth / ratio) / canvasWidth,
    })

    const link = document.createElement('a')
    link.download = 'background.jpeg'
    link.href = imageDataUrl
    link.click()
})

uploadPhotoButton?.addEventListener('click', async () => {
    handleUploadPhoto()
})

uploadObjectButton?.addEventListener('click', async () => {
    handleUploadObject()
})

const handleUploadPhoto = async () => {
    const files = await selectFiles()
    const images = await createImages(files)
    addImages(images)
}

const handleUploadObject = async () => {
    const files = await selectFiles()
    toggleLoading()
    const removedBackgroundFiles = await removeBackground(files)
    const images = await createImages(removedBackgroundFiles)
    addImages(images, false)
    toggleLoading()
}

const selectFiles = async () => {
    const fileHandlers = await window.showOpenFilePicker({ multiple: true })
    return await Promise.all(fileHandlers.map(handler => handler.getFile()))
}

const createImages = (files: File[]) => {
    return Promise.all(files.map(file => {
        return new Promise<HTMLImageElement>((resolve) => {
            const image = new Image()
            image.onload = () => resolve(image)
            image.src = URL.createObjectURL(file)
        })
    }))
}

const addImages = (images: HTMLImageElement[], withFrame: boolean = true) => {
    images.forEach((image) => {
        const group = new Konva.Group({
            draggable: true,
        })
    
        const imageWidth = image.naturalWidth * 0.1
        const imageHeight = image.naturalHeight * 0.1
    
        const konvaImage = new Konva.Image({
            x: 0,
            y: 0,
            image,
            width: imageWidth,
            height: imageHeight,
        })
    
        group.addEventListener('click', () => {
            handleImageClick(group)
        })
    
        if (withFrame) {
            const imageFrame = new Konva.Rect({
                x: 0,
                y: 0,
                width: imageWidth + FRAME_WIDTH,
                height: imageHeight + FRAME_WIDTH,
                shadowColor: '#000',
                shadowOpacity: 0.25,
                shadowBlur: 4,
                shadowOffset: { x: 2, y: 5 },
                fill: '#FFF',
            })

            konvaImage.x((imageFrame.width() / 2) - (imageWidth / 2))
            konvaImage.y((imageFrame.height() / 2 - (imageHeight / 2)))

            group.add(imageFrame)
        }
        group.add(konvaImage)
        layer.add(group)
        layer.draw()
    })
}

const removeBackground = (files: File[]) => {
    return Promise.all(files.map(async file => {
        const blob = await backgroundRemoval(file, { progress: handleProgress })
        return new File([blob], file.name)
    }))
}

const toggleLoading = () => {
    uploadObjectProgress?.classList.toggle('invisible')
    uploadObjectButton?.classList.toggle('invisible')
}

const handleProgress = (key: string, current: number, total: number) => {
    const action = key.split(':')[0]

    const percentage = Math.round(current / total * 100)

    if (uploadObjectProgress) {
        if (action === 'compute') {
            uploadObjectProgress.innerText = `Eliminando el fondo`
        } else {
            uploadObjectProgress.innerText = `${percentage}%`
        }
    }
}

const handleImageClick = (image: Konva.Group) => {
    transformer.setNodes([image])
}