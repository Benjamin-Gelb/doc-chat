import { useState, useRef, useEffect } from "react"
import Spinner from "./Spinner"





const DocumentUpload = ({ uploadedDocs, setUploadedDocs }: { uploadedDocs: String[], setUploadedDocs: React.Dispatch<React.SetStateAction<String[]>> }) => {
    const [stagedFiles, stageFiles] = useState<File[]>([])
    const [loading, setLoading] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)
    const [customStyles, setCustomStyles] = useState({})

    function addFiles(files: FileList) {
        for (const file of files) {
            stageFiles(prev => prev.concat(file))
        }
    }

    async function uploadToServer(files: File[]) {
        const fd = new FormData()
        for (const file of files) {
            fd.append('files', file)
        }
        const url = `${import.meta.env.VITE_LLM_SERVER}/document`
        try {
            setLoading(true)
            const response = await fetch(url, {
                credentials: 'include',
                method: 'POST',
                body: fd,
            })
            const uploadResults: {
                documents: String[]
            } = await response.json()
            setUploadedDocs(prev => prev.concat(uploadResults.documents))
            stageFiles([])

        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    async function clearDocuments() {
        const url = `${import.meta.env.VITE_LLM_SERVER}/document`
        try {
            const response = await fetch(url, {
                method: 'DELETE',
                credentials: 'include'
            })
            if (response.ok) {
                setUploadedDocs([])
                stageFiles([])
            }
            console.log(await response.text())
        } catch (err) {
            console.error(err)
        }
    }

    useEffect(() => {
        if (stagedFiles.length === 0) {
            return
        }
        uploadToServer(stagedFiles)
    }, [stagedFiles])

    return (
        <>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ alignSelf: 'center' }}>
                    <Spinner show={true} spin={loading} />
                </div>
            </div>
            <div className='card' >

                <h3 style={{ margin: '0.5rem' }}>Uploaded Documents:</h3>
                <div>
                    {uploadedDocs.map((filename, i) => <div style={{ color: 'green' }} key={i}>{filename}</div>)}
                    {stagedFiles.map((file, i) => <div key={i}>{file.name}</div>)}

                </div>

            </div>
            <div className='document-upload' style={customStyles} onDragOver={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setCustomStyles({
                    border: "4px #B3FFFC dotted"
                })

            }} onDragLeave={(e) => {
                setCustomStyles({})
            }}
                onDrop={(e) => {
                    e.preventDefault()
                    setCustomStyles({})
                    addFiles(e.dataTransfer.files)
                }}
            >
                <input accept='.pdf' onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    if (e.target.files) {
                        addFiles(e.target.files)
                    }
                    e.target.value = ''
                }} ref={inputRef} type="file" hidden={true} />
                <button onClick={(e) => {
                    inputRef.current?.click()
                }}>
                    Upload
                </button>
                <h5>Or drag and drop.</h5>


                <button onClick={() => {
                    clearDocuments()
                }}>
                    Clear Documents
                </button>
            </div>
        </>
    )
}

export default DocumentUpload