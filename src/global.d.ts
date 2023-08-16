interface Window {
    showOpenFilePicker: (options?: {
        multiple?: boolean
        excludeAcceptAllOption?: boolean
        types?: {
            description?: string
            accept: {
                [mimetype: string]: string
            }
        }[]
    }) => Promise<FileSystemFileHandle[]>
}