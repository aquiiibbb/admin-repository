// Pretty, colour-coded JSON (read-only)
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function highlight(json) {
  return esc(json).replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
    (m) => {
      let cls = 'n'
      if (/^"/.test(m)) cls = /:$/.test(m) ? 'k' : 's'
      else if (/true|false/.test(m)) cls = 'b'
      else if (/null/.test(m)) cls = 'z'
      return `<span class="${cls}">${m}</span>`
    }
  )
}

// long base64 images would freeze the screen: show their size instead
const clip = (key, v) => (typeof v === 'string' && v.startsWith('data:') ? `[file ${Math.round(v.length / 1024)} KB]` : v)

export default function JsonView({ value }) {
  const text = JSON.stringify(value, clip, 2)
  return <pre className="json" dangerouslySetInnerHTML={{ __html: highlight(text ?? '') }} />
}
