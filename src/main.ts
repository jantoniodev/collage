import Konva from 'konva'
import backgroundRemoval from '@imgly/background-removal'

const FRAME_WIDTH = 40

const stage = new Konva.Stage({
    container: 'container',
    width: 1152,
    height: 719,
})

const layer = new Konva.Layer()
const transformer = new Konva.Transformer()
const background = new Konva.Rect({
    x: 0,
    y: 0,
    width: stage.width(),
    height: stage.height(),
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
const downloadButton = document.getElementById('download-button')

downloadButton?.addEventListener('click', () => {
    const imageDataUrl = stage.toDataURL({
        pixelRatio: 2
    })

    const link = document.createElement('a')
    link.download = 'background.png'
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
    const images = await Promise.all(createImages(files))
    addImages(images)
}

const handleUploadObject = async () => {
    const files = await selectFiles()
    const removedBackgroundFiles = await Promise.all(removeBackground(files))
    const images = await Promise.all(createImages(removedBackgroundFiles))
    addImages(images, false)
}

const selectFiles = async () => {
    const fileHandlers = await window.showOpenFilePicker({ multiple: true })
    return await Promise.all(fileHandlers.map(handler => handler.getFile()))
}

const createImages = (files: File[]) => {
    return files.map(file => {
        return new Promise<HTMLImageElement>((resolve) => {
            const image = new Image()
            image.onload = () => resolve(image)
            image.src = URL.createObjectURL(file)
        })
    })
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
    return files.map(async file => {
        return new Promise<File>((resolve, reject) => {
            backgroundRemoval(file)
                .then((blob) => {
                    resolve(new File([blob], file.name))
                })
                .catch((error) => {
                    reject(error)
                })
        })
    })
}

const handleImageClick = (image: Konva.Group) => {
    transformer.setNodes([image])
}