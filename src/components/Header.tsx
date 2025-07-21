import Image from 'next/image'
import Link from 'next/link'

export default function Header() {
  return (
    <header className="site-header">
      <div className="header-content">
        <Link href="/">
          <Image
            src="/adap_logo_1.png"
            alt="ADAP Logo"
            width={100}
            height={60}
            priority={true}
            className="logo"
          />
        </Link>
        <h1 className="header-title">American Design And Printing</h1>
      </div>
    </header>
  )
}
