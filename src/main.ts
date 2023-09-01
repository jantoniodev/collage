import Konva from 'konva'
import backgroundRemoval from '@imgly/background-removal'

const FRAME_WIDTH = 40

const resolution = {
    width: 1440,
    height: 900,
}

const zoom = 0.7
let currentColorFrame = '#FFF'
let currentFrameWidth = FRAME_WIDTH

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

const backLayer = new Konva.Layer()
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
stage.add(layer)

backLayer.add(transformer)
stage.add(backLayer)

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
const backgroundColorSelect = document.getElementById('background-color-select')
const frameColorSelect = document.getElementById('frame-color-select')
const frameWidthRange = document.getElementById('frame-width-range')

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

backgroundColorSelect?.addEventListener('input', (event) => {
    const target = event.target as HTMLInputElement
    background.fill(target.value)
})

window.addEventListener('keydown', (event) => {
    const keyCode = event.code
    if (keyCode === 'Backspace') {
        handleDeleteSelectedImages()
    }
})

frameColorSelect?.addEventListener('input', (event) => {
    const target = event.target as HTMLInputElement
    currentColorFrame = target.value
    changeEveryPhotoFrameColor(target.value)
})

frameWidthRange?.addEventListener('input', (event) => {
    const target = event.target as HTMLInputElement
    currentFrameWidth = parseInt(target.value)
    changeEveryPhotoFrameWidth(currentFrameWidth)
})

const handleUploadPhoto = async () => {
    const files = await selectFiles()
    const images = await createImages(files)
    addImages(images, true)
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
        const aspectRatio = image.naturalWidth / image.naturalHeight
    
        const konvaImage = new Konva.Image({
            x: (getResolution().width / 2) - ((getResolution().height / 2) * aspectRatio / 2),
            y: (getResolution().height / 2) - ((getResolution().height / 2) / 2),
            image,
            width: (getResolution().height / 2) * aspectRatio,
            height: getResolution().height / 2,
            rotation: Math.random() * 4 - 2,
            draggable: true,
        })
    
        konvaImage.addEventListener('click', () => {
            handleImageClick(konvaImage)
        })
    
        if (withFrame) {
            konvaImage.stroke(currentColorFrame)
            konvaImage.strokeWidth(currentFrameWidth)
        }

        (konvaImage as any)['type'] = withFrame ? 'photo' : 'object'
        
        layer.add(konvaImage)
        layer.draw()
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

const handleImageClick = (image: Konva.Node) => {
    image.moveToTop()
    transformer.setNodes([image])
}

const handleDeleteSelectedImages = () => {
    const selectedNodes = transformer.getNodes()
    selectedNodes.forEach(node => node.destroy())
    transformer.setNodes([])
}

const resizeWorkspace = (width: number, height: number) => {
    resolution.width = width,
    resolution.height = height

    layer.x((stage.width() / 2) - (getResolution().width / 2))
    layer.y((stage.height() / 2) - (getResolution().height / 2))

    background.width(getResolution().width)
    background.height(getResolution().height)
}

const changeEveryPhotoFrameColor = (color: string) => {
    const images = layer.find<Konva.Image>('Image')
    images.forEach((image) => {
        image.stroke(color)
    })
    layer.draw()
}

const changeEveryPhotoFrameWidth = (width: number = 0) => {
    const images = layer.find<Konva.Image>('Image')
    images.forEach((image) => {
        const imageType = (image as any)['type'] || 'photo'
        image.strokeWidth(imageType === 'photo' ? width : 0)
    })
    layer.draw()
}