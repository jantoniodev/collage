import Konva from 'konva'

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

const uploadImageButton = document.getElementById('upload-image')
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

uploadImageButton?.addEventListener('click', async () => {
    const fileHandlers = await window.showOpenFilePicker({ multiple: true })
    const files = await Promise.all(fileHandlers.map(handler => handler.getFile()))

    files.map(file => {
        const image = new Image()
        image.onload = () => handleImageLoad(image)
        image.src = URL.createObjectURL(file)
    })
})

const handleImageLoad = (image: HTMLImageElement) => {
    const group = new Konva.Group({
        draggable: true,
    })

    const imageWidth = image.naturalWidth * 0.1
    const imageHeight = image.naturalHeight * 0.1

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

    const konvaImage = new Konva.Image({
        x: (imageFrame.width() / 2) - (imageWidth / 2),
        y: (imageFrame.height() / 2 - (imageHeight / 2)),
        image,
        width: imageWidth,
        height: imageHeight,
    })

    group.addEventListener('click', () => {
        handleImageClick(group)
    })

    group.add(imageFrame)
    group.add(konvaImage)
    layer.add(group)
    layer.draw()
}

const handleImageClick = (image: Konva.Group) => {
    transformer.setNodes([image])
}