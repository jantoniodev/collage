import Konva from 'konva'
import backgroundRemoval from '@imgly/background-removal'

const FRAME_WIDTH = 40

const resolution = {
    width: 1440,
    height: 900,
}

const zoom = 0.7

const loadedImages: Konva.Node[] = []

const getResolution = () => {
    return {
        width: resolution.width * zoom,
        height: resolution.height * zoom,
    }
}

const stage = new Konva.Stage({
    container: 'container',
    width: 1152,
    height: 719,
})

const layer = new Konva.Layer({
    x: (stage.width() / 2) - (getResolution().width / 2),
    y: (stage.height() / 2) - (getResolution().height / 2),
})
const transformer = new Konva.Transformer()
const background = new Konva.Rect({
    x: 0,
    y: 0,
    width: getResolution().width,
    height: getResolution().height,
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
const resolutionSelect = document.getElementById('resolution-select')

resolutionSelect?.addEventListener('change', (event) => {
    const selectElement = event.target as HTMLSelectElement
    const [selectedWidth, selectedHeight] = selectElement.value.split('x').map(e => parseInt(e))
    resizeWorkspace(selectedWidth, selectedHeight)
})

downloadButton?.addEventListener('click', () => {
    const imageDataUrl = stage.toDataURL({
        mimeType: 'image/jpeg',
        x: layer.x(),
        y: layer.y(),
        width: background.width(),
        height: background.height(),
        quality: 1,
        /*
            La expresión para pixel ratio se puede simplificar matemáticamente como 1 / ratio
            pero al hacerlo así existe un problema de redondeo en la resolución final con la que se exporta la imágen
            por lo tanto se deja de la forma completa.
        */
        pixelRatio: (background.width() / zoom) / background.width(),
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
    const createdImages = addImages(images)
    loadedImages.push(...createdImages)
    arrangeImages(loadedImages)
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
    const createdImages: Konva.Node[] = []
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

        createdImages.push(group)
    })
    return createdImages
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

const arrangeImages = (images: Konva.Node[]) => {
    const rows = Math.ceil(Math.sqrt(images.length))
    const columns = Math.ceil(images.length / rows)

    const subdivisionSize = {
        width: Math.round(getResolution().width / rows),
        height: Math.round(getResolution().height / columns),
    }

    images.forEach((image, index) => {
        // Cambiar el tamaño
        const { width, height } = image.getClientRect()
        
        const aspectRatio = width / height

        image.scale({
            x: subdivisionSize.height * aspectRatio / width,
            y: subdivisionSize.height / height
        })

        // Posicionar imagenes
        image.x(((index % rows) * subdivisionSize.width) + (subdivisionSize.width / 2) - (image.getClientRect().width / 2))
        image.y((Math.floor(index / rows) * subdivisionSize.height) + (subdivisionSize.height / 2) - (image.getClientRect().height / 2))

        // Rotar aleatoriamente las imagenes
        const randomRotation = Math.random() * 4 - 2
        image.rotate(randomRotation)
    })
}

const handleImageClick = (image: Konva.Group) => {
    transformer.setNodes([image])
}

const resizeWorkspace = (width: number, height: number) => {
    resolution.width = width,
    resolution.height = height

    layer.x((stage.width() / 2) - (getResolution().width / 2))
    layer.y((stage.height() / 2) - (getResolution().height / 2))

    background.width(getResolution().width)
    background.height(getResolution().height)
}