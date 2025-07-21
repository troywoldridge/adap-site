import Link from 'next/link'

export default function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link href="/" className="nav-logo">
          ADAP
        </Link>

        <ul className="nav-menu">
          {/* Print Products dropdown */}
          <li className="nav-item dropdown">
            <Link href="/category/print-products" className="nav-link">
              Print Products
            </Link>
            <ul className="dropdown-menu">

              {/* Business Cards */}
              <li className="dropdown-item">
                <Link href="/category/print-products/business-cards">Business Cards</Link>
                <ul className="sub-dropdown-menu">
                  <li><Link href="/product/standard-business-cards">Standard Business Cards</Link></li>
                  <li><Link href="/product/premium-business-cards">Premium Business Cards</Link></li>
                </ul>
              </li>

              {/* Flyers */}
              <li className="dropdown-item">
                <Link href="/category/print-products/flyers">Flyers</Link>
                <ul className="sub-dropdown-menu">
                  <li><Link href="/product/standard-flyers">Standard Flyers</Link></li>
                  <li><Link href="/product/glossy-flyers">Glossy Flyers</Link></li>
                  <li><Link href="/product/matte-finish-flyers">Matte Flyers</Link></li>
                  <li><Link href="/product/uv-flyers">UV Flyers</Link></li>
                  <li><Link href="/product/enviro-uncoated-flyers">Enviro Uncoated Flyers</Link></li>
                  <li><Link href="/product/linen-uncoated-flyers">Linen Flyers</Link></li>
                </ul>
              </li>

              {/* Postcards */}
              <li className="dropdown-item">
                <Link href="/category/print-products/postcards">Postcards</Link>
                <ul className="sub-dropdown-menu">

                  {/* Matte Finish Postcards */}
                  <li className="dropdown-item">
                    <Link href="/product/matte-finish-postcards">Matte Finish Postcards</Link>
                    <ul className="sub-dropdown-menu">
                      <li><Link href="/product/10pt-matte-postcards">10pt Matte Finish</Link></li>
                      <li><Link href="/product/14pt-matte-postcards">14pt Matte Finish</Link></li>
                      <li><Link href="/product/16pt-matte-postcards">16pt Matte Finish</Link></li>
                    </ul>
                  </li>

                  {/* UV High Gloss Postcards */}
                  <li className="dropdown-item">
                    <Link href="/product/UV-High-Gloss-postcards">UV High Gloss Postcards</Link>
                    <ul className="sub-dropdown-menu">
                      <li><Link href="/product/14pt-high-gloss">14pt High Gloss Finish</Link></li>
                      <li><Link href="/product/16pt-high-gloss">16pt High Gloss Finish</Link></li>
                    </ul>
                  </li>

                  {/* Laminated Postcards */}
                  <li className="dropdown-item">
                    <Link href="/product/laminated-postcards">Laminated Postcards</Link>
                    <ul className="sub-dropdown-menu">
                      <li><Link href="/product/18pt-gloss-lamination">18pt Gloss Laminated</Link></li>
                      <li><Link href="/product/18pt-matte-silk">18pt Matte / Silk Finish</Link></li>
                    </ul>
                  </li>

                  {/* AQ Postcards */}
                  <li className="dropdown-item">
                    <Link href="/product/aq-postcards">AQ Postcards</Link>
                    <ul className="sub-dropdown-menu">
                      <li><Link href="/product/10pt-aq-postcards">10pt AQ Finish</Link></li>
                      <li><Link href="/product/14pt-aq-postcards">14pt AQ Finish</Link></li>
                      <li><Link href="/product/16pt-aq-postcards">16pt AQ Finish</Link></li>
                    </ul>
                  </li>

                  {/* Writable Postcards */}
                  <li className="dropdown-item">
                    <Link href="/product/writable-postcards">Writable Postcards</Link>
                    <ul className="sub-dropdown-menu">
                      <li><Link href="/product/13pt-enviro-uncoated-postcards">13pt Enviro Uncoated</Link></li>
                      <li><Link href="/product/13pt-linen-uncoated-postcards">13pt Linen Uncoated</Link></li>
                      <li><Link href="/product/14pt-writable-aq">14pt Writable + AQ</Link></li>
                      <li><Link href="/product/14pt-writable-uv">14pt Writable + UV</Link></li>
                    </ul>
                  </li>

                  {/* Specialty Postcards */}
                  <li className="dropdown-item">
                    <Link href="/product/specialty-postcards">Specialty Postcards</Link>
                    <ul className="sub-dropdown-menu">
                      <li><Link href="/product/metallic-foil-postcards">Metallic Foil</Link></li>
                      <li><Link href="/product/spot-uv-postcards">Spot UV</Link></li>
                      <li><Link href="/product/kraft-paper-postcards">Kraft Paper</Link></li>
                      <li><Link href="/product/pearl-paper-postcards">Pearl Paper</Link></li>
                    </ul>
                  </li>
                </ul>
              </li>

              {/* Brochures */}
              <li className="dropdown-item">
                <Link href="/category/print-products/brochures">Brochures</Link>
                <ul className="sub-dropdown-menu">
              <li className="dropdown-item">
                  <Link href="/product/gloss-text-brochures">Gloss Text Brochures</Link>
                <ul className="sub-dropdown-menu">
              <li><Link href="/product/100lb-gloss-text">100lb Gloss Text</Link></li>
                </ul>
              </li>
              <li className="dropdown-item">
                  <Link href="/product/matte-finish-brochures">Matte Finish Brochures</Link>
                <ul className="sub-dropdown-menu">
              <li><Link href="/product/100lb-matte-finish">100lb Matte Finish</Link></li>
                </ul>
              </li>
              <li className="dropdown-item">
                  <Link href="/product/uv-high-gloss-brochures">UV High Gloss Brochures</Link>
                <ul className="sub-dropdown-menu">
              <li><Link href="/product/100lb-uv-high-gloss-finish">100lb UV High Gloss</Link></li>
                </ul>
              </li>
             <li className="dropdown-item">
      <Link href="/product/enviro-uncoated-brochures">Enviro Uncoated Brochures</Link>
      <ul className="sub-dropdown-menu">
        <li><Link href="/product/80lb-enviro-uncoated">80lb Enviro Uncoated</Link></li>
      </ul>
    </li>
  </ul>
</li>

{/* Bookmarks */}
<li className="dropdown-item">
  <Link href="/category/print-products/bookmarks">Bookmarks</Link>
  <ul className="sub-dropdown-menu">

    {/* Matte Bookmarks */}
    <li className="dropdown-item">
      <Link href="/product/matte-bookmarks">Matte Bookmarks</Link>
      <ul className="sub-dropdown-menu">
        <li><Link href="/product/10pt-matte-bookmarks">10pt Matte Finish</Link></li>
        <li><Link href="/product/14pt-matte-bookmarks">14pt Matte Finish</Link></li>
        <li><Link href="/product/16pt-matte-bookmarks">16pt Matte Finish</Link></li>
      </ul>
    </li>

    {/* UV Bookmarks */}
    <li className="dropdown-item">
      <Link href="/product/uv-high-gloss-bookmarks">UV High Gloss Bookmarks</Link>
      <ul className="sub-dropdown-menu">
        <li><Link href="/product/14pt-uv-bookmarks">14pt UV High Gloss</Link></li>
        <li><Link href="/product/16pt-uv-bookmarks">16pt UV High Gloss</Link></li>
      </ul>
    </li>

    {/* Laminated Bookmarks */}
    <li className="dropdown-item">
      <Link href="/product/laminated-bookmarks">Laminated Bookmarks</Link>
      <ul className="sub-dropdown-menu">
        <li><Link href="/product/18pt-matte-silk-laminated-bookmarks">18pt Matte with Silk Lamination</Link></li>
        <li><Link href="/product/18pt-gloss-laminated-bookmarks">18pt Gloss Lamination</Link></li>
      </ul>
    </li>

    {/* Specialty Bookmarks */}
    <li className="dropdown-item">
      <Link href="/product/specialty-bookmarks">Specialty Bookmarks</Link>
      <ul className="sub-dropdown-menu">
        <li><Link href="/product/13pt-enviro-uncoated-bookmarks">13pt Enviro Uncoated</Link></li>
        <li><Link href="/product/13pt-linen-uncoated-bookmarks">13pt Linen Uncoated</Link></li>
        <li><Link href="/product/14pt-writable-uv-bookmarks">14pt Writable UV C1S</Link></li>
        <li><Link href="/product/18pt-matte-lam-spot-uv-bookmarks">18pt Matte Lam + SPOT UV</Link></li>
      </ul>
    </li>

    <li className="dropdown-item">
      <Link href="/product/uv-high-gloss-bookmarks">UV High Gloss Bookmarks</Link>
      <ul className="sub-dropdown-menu">
        <li><Link href="/product/14pt-uv-bookmarks">14pt UV High Gloss</Link></li>
        <li><Link href="/product/16pt-uv-bookmarks">16pt UV High Gloss</Link></li>
      </ul>
    </li>
    <li className="dropdown-item">
      <Link href="/product/laminated-bookmarks">Laminated Bookmarks</Link>
      <ul className="sub-dropdown-menu">
        <li><Link href="/product/18pt-matte-silk-laminated-bookmarks">18pt Matte with Silk Lamination</Link></li>
        <li><Link href="/product/18pt-gloss-laminated-bookmarks">18pt Gloss Lamination</Link></li>
      </ul>
    </li>
    <li className="dropdown-item">
      <Link href="/product/specialty-bookmarks">Specialty Bookmarks</Link>
      <ul className="sub-dropdown-menu">
        <li><Link href="/product/13pt-enviro-uncoated-bookmarks">13pt Enviro Uncoated</Link></li>
        <li><Link href="/product/13pt-linen-uncoated-bookmarks">13pt Linen Uncoated</Link></li>
        <li><Link href="/product/14pt-writable-uv-bookmarks">14pt Writable UV C1S</Link></li>
        <li><Link href="/product/18pt-matte-lam-spot-uv-bookmarks">18pt Matte Lam + SPOT UV</Link></li>
      </ul>
    </li>
  </ul>
</li>

{/* Presentation Folders */}
<li className="dropdown-item">
  <Link href="/category/print-products/presentation-folders">Presentation Folders</Link>
  <ul className="sub-dropdown-menu">
    <li className="dropdown-item">
      <Link href="/product/matte-folders">Standard Matte Finish</Link>
      <ul className="sub-dropdown-menu">
        <li><Link href="/product/14pt-matte-finish-folder">14pt Matte Finish</Link></li>
      </ul>
    </li>
    <li className="dropdown-item">
      <Link href="/product/standard-uv-folders">Standard UV</Link>
      <ul className="sub-dropdown-menu">
        <li><Link href="/product/14pt-standard-uv-folders">14pt Standard UV</Link></li>
      </ul>
    </li>
    <li className="dropdown-item">
      <Link href="/product/matte-laminated-folders">Matte Laminated</Link>
      <ul className="sub-dropdown-menu">
        <li><Link href="/product/14pt-matte-laminated-folders">14pt Matte Laminated</Link></li>
      </ul>
    </li>
    <li className="dropdown-item">
  <Link href="/product/standard-aq-folders">Standard AQ</Link>
  <ul className="sub-dropdown-menu">
    <li><Link href="/product/14pt-standard-aq-folders">14pt Standard AQ</Link></li>
  </ul>
</li>

<li className="dropdown-item">
  <Link href="/product/specialty-folders">Specialty Folders</Link>
  <ul className="sub-dropdown-menu">
    <li><Link href="/product/metallic-foil-folder">Metallic Foil</Link></li>
  </ul>
</li>

</ul> {/* End of .sub-dropdown-menu for Presentation Folders */}
</li> {/* End of .dropdown-item for Presentation Folders */}

</ul> {/* End of .dropdown-menu for Print Products */}
</li> {/* End of .nav-item for Print Products */}

</ul> {/* End of .nav-menu */}
</div> {/* End of .navbar-container */}
</nav>
  )
}
