import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

export function AppleIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M17.05 12.536c-.026-2.61 2.13-3.86 2.226-3.923-1.213-1.774-3.1-2.017-3.77-2.044-1.605-.163-3.132.945-3.946.945-.813 0-2.07-.922-3.404-.897-1.75.026-3.363 1.017-4.263 2.585-1.817 3.15-.464 7.815 1.305 10.375.865 1.253 1.896 2.66 3.25 2.61 1.304-.052 1.797-.844 3.374-.844 1.577 0 2.02.844 3.4.818 1.402-.026 2.29-1.28 3.15-2.538.99-1.448 1.397-2.85 1.42-2.923-.031-.014-2.723-1.045-2.75-4.145zM14.5 4.9c.72-.872 1.204-2.084 1.072-3.29-1.036.042-2.29.69-3.034 1.56-.666.77-1.25 2.003-1.093 3.184 1.155.09 2.335-.587 3.055-1.454z" />
    </svg>
  )
}

export function VercelIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M12 2.5 22.5 20.5H1.5z" />
    </svg>
  )
}

export function SupabaseIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M13.62 2.02c0-.83-1.05-1.19-1.55-.53L3.13 12.2a.94.94 0 0 0 .76 1.5h7.02v8.28c0 .83 1.05 1.19 1.55.53l8.94-10.71a.94.94 0 0 0-.76-1.5h-7.02V2.02Z" />
    </svg>
  )
}

export function OpencodeIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden {...props}>
      <rect
        x="2.6"
        y="4"
        width="18.8"
        height="16"
        rx="4.4"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M7.4 10.4 10 13l-2.6 2.6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12.6 15.6h4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}
