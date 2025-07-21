import Link from 'next/link'
import Image from 'next/image'

export default function Header() {
  return (
     <header>
       <h1>American Design And Printing</h1>
      <Link href="/">
        <Image
          src="/adap_logo_1.png"
          alt="ADAP Logo"
          width={150}
          height={50}
          priority={true}
          className="logo"
        />
      </Link>
    </header>
  )
}
