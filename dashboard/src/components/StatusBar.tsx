export default function StatusBar() {
  return (
    <>
      <div className="notch-wrap">
        <div className="notch"></div>
      </div>
      <div className="status-bar">
        <div className="status-time">9:41</div>
        <div className="status-icons">
          <svg width="17" height="12" viewBox="0 0 17 12">
            <rect x="0" y="7" width="3" height="5" rx="1" opacity="1" />
            <rect x="4.5" y="5" width="3" height="7" rx="1" opacity="1" />
            <rect x="9" y="2.5" width="3" height="9.5" rx="1" opacity="0.5" />
            <rect x="13.5" y="0" width="3" height="12" rx="1" opacity="0.3" />
          </svg>
          <svg width="16" height="12" viewBox="0 0 16 12">
            <path d="M8 9.5 A0.8 0.8 0 0 1 8 11.1 A0.8 0.8 0 0 1 8 9.5Z" fill="white" />
            <path d="M5.2 7.0 Q8 4.5 10.8 7.0" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            <path d="M2.5 4.5 Q8 -0.5 13.5 4.5" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.5" />
          </svg>
          <svg width="25" height="12" viewBox="0 0 25 12">
            <rect x="0" y="1" width="21" height="10" rx="3" stroke="white" strokeWidth="1.2" fill="none" opacity="0.7" />
            <rect x="21.5" y="4" width="2" height="4" rx="1" fill="white" opacity="0.5" />
            <rect x="1.5" y="2.5" width="16" height="7" rx="2" fill="white" />
          </svg>
        </div>
      </div>
    </>
  )
}
