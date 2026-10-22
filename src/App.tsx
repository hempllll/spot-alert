import { useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <main className="app">
      <h1>spot-alert</h1>
      <p className="tagline">Windsurf spot forecast — environment setup ✅</p>
      <button type="button" onClick={() => setCount((c) => c + 1)}>
        clicked {count} {count === 1 ? 'time' : 'times'}
      </button>
    </main>
  )
}

export default App
