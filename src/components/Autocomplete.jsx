import { useState, useEffect, useRef } from 'react'
import { Search, X, Loader2 } from 'lucide-react'

const Autocomplete = ({
    onSearch,
    onSelect,
    placeholder = "Buscar...",
    minLength = 3,
    debounceTime = 500,
    initialValue = ""
}) => {
    const [query, setQuery] = useState(initialValue)
    const [results, setResults] = useState([])
    const [loading, setLoading] = useState(false)
    const [isOpen, setIsOpen] = useState(false)
    const wrapperRef = useRef(null)

    // Debounce Logic
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (query.length >= minLength) {
                setLoading(true)
                try {
                    const data = await onSearch(query)
                    if (data) {
                        setResults(data)
                        setIsOpen(true)
                    } else {
                        setResults([])
                        setIsOpen(false)
                    }
                } catch (error) {
                    console.error("Autocomplete search error:", error)
                    setResults([])
                } finally {
                    setLoading(false)
                }
            } else {
                setResults([])
                setIsOpen(false)
            }
        }, debounceTime)

        return () => clearTimeout(timer)
    }, [query, minLength, debounceTime, onSearch])

    // Click outside to close
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const handleSelect = (item) => {
        setQuery(item.label) // Display label in input
        setIsOpen(false)
        onSelect(item)
    }

    const clearSelection = () => {
        setQuery("")
        setResults([])
        setIsOpen(false)
        onSelect(null) // Notify parent of clearance
    }

    return (
        <div ref={wrapperRef} className="relative w-full">
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                    type="text"
                    className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none pl-10 pr-10"
                    placeholder={placeholder}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => {
                        if (results.length > 0) setIsOpen(true)
                    }}
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    {loading ? (
                        <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                    ) : query ? (
                        <button
                            type="button"
                            onClick={clearSelection}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    ) : null}
                </div>
            </div>

            {isOpen && (
                <ul className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                    {results.length > 0 ? (
                        results.map((item, index) => (
                            <li
                                key={index}
                                className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-blue-50 text-gray-900"
                                onClick={() => handleSelect(item)}
                            >
                                <div className="flex items-center">
                                    <span className={`block truncate ${item.subLabel ? 'font-semibold' : 'font-normal'}`}>
                                        {item.label}
                                    </span>
                                    {item.subLabel && (
                                        <span className="ml-2 truncate text-gray-500 text-xs">
                                            - {item.subLabel}
                                        </span>
                                    )}
                                </div>
                            </li>
                        ))
                    ) : (
                        !loading && (
                            <li className="cursor-default select-none relative py-2 pl-3 pr-9 text-gray-500 italic">
                                Nenhum resultado encontrado.
                            </li>
                        )
                    )}
                </ul>
            )}
        </div>
    )
}

export default Autocomplete
