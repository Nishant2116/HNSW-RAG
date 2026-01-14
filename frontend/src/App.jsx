import { useState } from 'react'
import axios from 'axios'
import { ChatInterface } from './components/ChatInterface'
import { HNSWVisualization } from './components/HNSWVisualization'

export default function App() {
  const [chatHistory, setChatHistory] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [currentQuery, setCurrentQuery] = useState('')

  const handleSearch = async (query) => {
    setIsSearching(true)
    setCurrentQuery(query)
    
    try {
      // Simulate network delay for visualization purposes + Fetch
      // In a real app, the backend request happens here
      const res = await axios.post('http://localhost:8000/search', { query })
      
      // Delay slightly to let animation play
      setTimeout(() => {
        const botResponse = {
          role: 'assistant',
          content: "I found some relevant information based on your query.",
          results: res.data
        }
        setChatHistory(prev => [...prev, botResponse])
        setIsSearching(false) // Stop animation
      }, 1500)
      
    } catch (err) {
      console.error(err)
      setChatHistory(prev => [...prev, { 
        role: 'assistant', 
        content: "Sorry, I encountered an error while searching." 
      }])
      setIsSearching(false)
    }
  }

  const handleUpload = async (file) => {
    console.log('Starting upload for file:', file.name)
    setIsUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      console.log('Sending request to backend...')
      const res = await axios.post('http://localhost:8000/ingest', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      console.log('Upload response:', res.data)
      setChatHistory(prev => [...prev, { 
        role: 'assistant', 
        content: `Successfully ingested ${file.name}. ${res.data.chunks_added} chunks added to index.` 
      }])
    } catch (err) {
      console.error('Upload error:', err)
      const errorMsg = err.response?.data?.detail || err.message || 'Unknown error'
      setChatHistory(prev => [...prev, { 
        role: 'assistant', 
        content: `Failed to upload file: ${errorMsg}` 
      }])
    } finally {
      setIsUploading(false)
    }
  }

  const handleReset = () => {
    setChatHistory([])
    setIsSearching(false)
  }

  return (
    <div className="flex h-screen w-screen bg-black overflow-hidden font-sans">
      {/* Left Panel: Chat (45% width) */}
      <div className="w-[45%] h-full min-w-[400px]">
        <ChatInterface 
          onSearch={handleSearch}
          onUpload={handleUpload}
          isUploading={isUploading}
          chatHistory={chatHistory}
          setChatHistory={setChatHistory}
          onReset={handleReset}
          isSearching={isSearching}
        />
      </div>

      {/* Right Panel: Utilization (55% width) */}
      <div className="w-[55%] h-full relative">
        <HNSWVisualization isSearching={isSearching} currentQuery={currentQuery} />
      </div>
    </div>
  )
}
