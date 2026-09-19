const paths = {
  car: <><path d="M3 13l2.5-6A2 2 0 0 1 7.4 6h9.2a2 2 0 0 1 1.9 1.3L21 13" /><rect x="2" y="13" width="20" height="6" rx="1.5" /><circle cx="7" cy="19" r="1.6" /><circle cx="17" cy="19" r="1.6" /><path d="M6 13h12" /></>,
  sparkle: <><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" /><path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z" /></>,
  shield: <><path d="M12 3l7 3v5c0 5-3.2 8.4-7 10-3.8-1.6-7-5-7-10V6z" /><path d="M9 12l2 2 4-4" /></>,
  truck: <><path d="M3 7h10v9H3z" /><path d="M13 10h4l3 3v3h-7z" /><circle cx="7" cy="18" r="1.8" /><circle cx="17" cy="18" r="1.8" /></>,
  rv: <><path d="M3 8h13l4 4v5H3z" /><path d="M3 12h17" /><path d="M7 8v4M12 8v4" /><circle cx="7" cy="19" r="1.7" /><circle cx="17" cy="19" r="1.7" /></>,
  tractor: <><path d="M4 14h3V9h5l2 5h5v3H4z" /><circle cx="7" cy="17" r="3" /><circle cx="18" cy="18" r="2" /><path d="M9 9V5h3" /></>,
  water: <><path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" /><path d="M9 14a3 3 0 0 0 3 3" /></>,
  phone: <><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" /></>,
  message: <><path d="M4 5h16v11H8l-4 4z" /></>,
  pin: <><path d="M12 21s-7-6.5-7-11a7 7 0 0 1 14 0c0 4.5-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></>,
  check: <path d="M5 12l4 4L19 6" />,
  hand: <><path d="M8 13V6a1.5 1.5 0 0 1 3 0v6" /><path d="M11 12V4a1.5 1.5 0 0 1 3 0v8" /><path d="M14 12V6a1.5 1.5 0 0 1 3 0v8a6 6 0 0 1-12 0v-2a1.5 1.5 0 0 1 3 0" /></>,
  layers: <><path d="M12 3l9 5-9 5-9-5z" /><path d="M3 13l9 5 9-5" /><path d="M3 17l9 5 9-5" /></>,
  tag: <><path d="M3 12V4h8l10 10-8 8z" /><circle cx="7.5" cy="8.5" r="1.5" /></>,
  menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
  x: <><path d="M6 6l12 12M18 6L6 18" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18" /></>,
  whatsapp: <path d="M12 3a9 9 0 0 0-7.7 13.6L3 21l4.5-1.2A9 9 0 1 0 12 3zm4.8 12.8c-.2.6-1.2 1.1-1.7 1.2-.4.1-1 .1-1.6-.1-.4-.1-.9-.3-1.5-.6-2.6-1.1-4.3-3.8-4.5-4-.1-.2-1-1.3-1-2.5s.6-1.8.9-2c.2-.2.5-.3.7-.3h.5c.2 0 .4 0 .6.5.2.5.7 1.7.7 1.8.1.2.1.3 0 .5-.1.2-.2.3-.3.5-.2.2-.3.3-.5.5-.2.2-.4.4-.2.7.3.6 1 1.3 1.6 1.8.7.6 1.3.9 1.6 1 .3.1.4.1.6-.1.2-.2.7-.8.9-1.1.2-.3.4-.2.6-.1.3.1 1.6.7 1.8.8.2.1.4.2.5.3.1.2.1.7-.1 1.3z" />,
  image: <><rect x="3" y="4" width="18" height="16" rx="1.5" /><circle cx="8.5" cy="9.5" r="1.7" /><path d="M3 17l5.5-5.5a2 2 0 0 1 2.8 0L14 14l1.5-1.5a2 2 0 0 1 2.8 0L21 15.5" /></>,
  star: <path d="M12 3l2.6 5.6 6 .8-4.4 4.2 1.1 6-5.3-3-5.3 3 1.1-6L3 9.4l6-.8z" fill="currentColor" stroke="none" />,
}

export default function Icon({ name, size = 24, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {paths[name]}
    </svg>
  )
}
