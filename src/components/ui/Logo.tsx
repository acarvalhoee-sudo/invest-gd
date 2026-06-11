/** Logo SVG do sistema INVEST GD */
export function Logo({ className = 'h-8 w-auto' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 160 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Ícone de usina/raio */}
      <path d="M18 6L8 22h8l-4 12 14-18h-8L18 6z" fill="#0ea5e9" />
      <text x="36" y="28" fontFamily="Inter, sans-serif" fontWeight="700" fontSize="20" fill="#0369a1">
        INVEST
      </text>
      <text x="101" y="28" fontFamily="Inter, sans-serif" fontWeight="400" fontSize="20" fill="#0ea5e9">
        GD
      </text>
    </svg>
  )
}
