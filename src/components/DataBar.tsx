import { useRef } from 'react'

interface DataBarProps {
  canExport: boolean
  onDemo: () => void
  onExport: () => void
  onImportFile: (file: File) => void
}

/** Bottom bar: load demo spots, export a backup, import a file. */
export function DataBar({ canExport, onDemo, onExport, onImportFile }: DataBarProps) {
  const fileInput = useRef<HTMLInputElement>(null)

  return (
    <footer className="data-bar">
      <button type="button" onClick={onDemo}>
        Demo spots
      </button>
      <button type="button" onClick={onExport} disabled={!canExport}>
        Export
      </button>
      <button type="button" onClick={() => fileInput.current?.click()}>
        Import
      </button>
      <input
        ref={fileInput}
        type="file"
        accept=".json,application/json"
        aria-label="Import spots file"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onImportFile(file)
          e.target.value = '' // allow picking the same file again
        }}
      />
    </footer>
  )
}
