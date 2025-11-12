export default function LogoHex({ size = 34 }) {
  const s = `${size}px`;
  return (
    <div aria-label="FurniHive logo" className="grid place-items-center" style={{ width: s, height: s }}>
      <svg viewBox="0 0 100 100" width={s} height={s}>
        <defs>
          <linearGradient id="fhg" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#f59e0b"/>
            <stop offset="1" stopColor="#fb923c"/>
          </linearGradient>
        </defs>
        <path d="M50 4 91 28v44L50 96 9 72V28z" fill="url(#fhg)" stroke="#e98a05" strokeWidth="3"/>
        <text x="50" y="60" textAnchor="middle" fontSize="42" fontFamily="Poppins, system-ui" fill="#fff" fontWeight="700">F</text>
      </svg>
    </div>
  );
}
