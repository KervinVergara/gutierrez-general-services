const PRINT_CSS = `
  #__print_root { font-family: 'Manrope', ui-sans-serif, system-ui, sans-serif; color: #123b55; }
  .header { display: flex; align-items: center; gap: 14px; border-bottom: 3px solid #123b55; padding-bottom: 14px; margin-bottom: 20px; }
  .header img { height: 52px; }
  .header h1 { font-size: 20px; margin: 0; letter-spacing: 0.02em; }
  .header p { margin: 2px 0 0; font-size: 12px; color: #52616b; }
  #__print_root h2 { font-size: 22px; margin: 0 0 4px; }
  .muted { color: #52616b; }
  #__print_root table { width: 100%; border-collapse: collapse; margin-top: 14px; }
  #__print_root th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #52616b; border-bottom: 2px solid #dfeef5; padding: 6px 4px; }
  #__print_root td { padding: 10px 4px; border-bottom: 1px solid #dfeef5; font-size: 14px; }
  .right { text-align: right; }
  .total-row td { border-bottom: none; font-weight: 800; font-size: 17px; padding-top: 14px; }
  .badge { display: inline-block; background: #123b55; color: #f3c64e; font-weight: 800; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; padding: 4px 10px; border-radius: 999px; }
  .grid3 { display: flex; gap: 16px; margin-top: 18px; }
  .card { flex: 1; border: 1px solid #dfeef5; border-radius: 12px; padding: 14px; }
  .card h3 { font-size: 15px; margin: 0 0 6px; }
  .card p { font-size: 12px; color: #52616b; margin: 0; }
  .cat-group { margin-top: 20px; }
  .cat-group h3 { font-size: 16px; border-bottom: 2px solid #f3c64e; display: inline-block; padding-bottom: 2px; margin-bottom: 10px; }
  .cat-item { margin-bottom: 10px; }
  .cat-item .row { display: flex; justify-content: space-between; font-weight: 700; font-size: 14px; }
  .cat-item p { margin: 2px 0 0; font-size: 12px; color: #52616b; }
  .footer { margin-top: 30px; padding-top: 14px; border-top: 1px solid #dfeef5; font-size: 11px; color: #52616b; text-align: center; }
  .flyer-title { font-size: 34px; font-weight: 800; margin: 20px 0 6px; }
  .flyer-sub { font-size: 15px; color: #52616b; margin: 0 0 20px; }
  .cta { display: inline-block; background: #f3c64e; color: #123b55; font-weight: 800; padding: 10px 22px; border-radius: 999px; margin-top: 20px; }
`

let styleInjected = false

export function printDoc(bodyHtml, title = 'Documento') {
  if (!styleInjected) {
    const style = document.createElement('style')
    style.id = '__print_style'
    style.textContent = `
      #__print_root { display: none; }
      @media print {
        #root { display: none !important; }
        #__print_root { display: block !important; position: static; }
        @page { size: letter; margin: 0.6in; }
      }
      ${PRINT_CSS}
    `
    document.head.appendChild(style)
    styleInjected = true
  }

  let root = document.getElementById('__print_root')
  if (!root) {
    root = document.createElement('div')
    root.id = '__print_root'
    document.body.appendChild(root)
  }
  root.innerHTML = bodyHtml

  const prevTitle = document.title
  document.title = title
  window.print()
  setTimeout(() => { document.title = prevTitle }, 500)
}
