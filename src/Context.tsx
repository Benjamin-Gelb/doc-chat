import { useContext, createContext, useState } from "react";


type ApplicationContext = {
    documents: String[],
    setDocuments: React.Dispatch<React.SetStateAction<String[]>>
}


const Context = createContext<ApplicationContext>({})


const AppProvider = ({ children }: { children: JSX.Element }) => {
    const [documents, setDocuments] = useState<String[]>([])

    return <Context.Provider value={{ documents, setDocuments}}>
        {children}
    </Context.Provider>
}

const consumeContext = () => {
    return useContext(Context)
}

export default AppProvider
export { consumeContext }
