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

{/* ... inside your Print Products dropdown-menu UL */}

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
  </ul>
</li>

{/* Booklets */}
<li className="dropdown-item">
  <Link href="/category/print-products/booklets">Booklets</Link>
  <ul className="sub-dropdown-menu">
    <li><Link href="/product/80lb-gloss-text-8.5x5.5">80lb Gloss Text (8.5 x 5.5)</Link></li>
    <li><Link href="/product/80lb-gloss-text-8.5x11">80lb Gloss Text (8.5 x 11)</Link></li>
    <li><Link href="/product/100lb-gloss-text-8.5x5.5">100lb Gloss Text (8.5 x 5.5)</Link></li>
    <li><Link href="/product/100lb-gloss-text-8.5x11">100lb Gloss Text (8.5 x 11)</Link></li>
    <li><Link href="/product/60lb-offset-text-8.5x5.5">60lb Offset Text (8.5 x 5.5)</Link></li>
    <li><Link href="/product/60lb-offset-text-8.5x11">60lb Offset Text (8.5 x 11)</Link></li>
    <li><Link href="/product/80lb-silk-text-8.5x5.5">80lb Silk Text (8.5 x 5.5)</Link></li>
    <li><Link href="/product/80lb-silk-text-8.5x11">80lb Silk Text (8.5 x 11)</Link></li>
    <li><Link href="/product/100lb-silk-text-8.5x5.5">100lb Silk Text (8.5 x 5.5)</Link></li>
    <li><Link href="/product/100lb-silk-text-8.5x11">100lb Silk Text (8.5 x 11)</Link></li>
  </ul>
</li>

{/* Magnets */}
<li className="dropdown-item">
  <Link href="/category/print-products/magnets">Magnets</Link>
  <ul className="sub-dropdown-menu">
    <li><Link href="/product/magnets-14pt">Magnets (14pt)</Link></li>
    <li><Link href="/product/car-magnets-30mil">Car Magnets (30mil)</Link></li>
    <li><Link href="/product/cut-shape-magnets-30mil">Cut to Shape Magnets (30mil)</Link></li>
    <li><Link href="/product/cut-shape-magnets-20mil">Cut to Shape Magnets (20mil)</Link></li>
  </ul>
</li>

{/* Greeting Cards */}
<li className="dropdown-item">
  <Link href="/category/print-products/greeting-cards">Greeting Cards</Link>
  <ul className="sub-dropdown-menu">
    <li><Link href="/product/14pt-matte-greeting-cards">14pt + Matte Finish</Link></li>
    <li><Link href="/product/14pt-uv-greeting-cards">14pt + UV (High Gloss)</Link></li>
    <li><Link href="/product/14pt-writable-uv-greeting-cards">14pt Writable + UV (C1S)</Link></li>
    <li><Link href="/product/13pt-enviro-greeting-cards">13pt Enviro Uncoated</Link></li>
    <li><Link href="/product/14pt-aq-greeting-cards">14pt + AQ</Link></li>
    <li><Link href="/product/14pt-writable-aq-greeting-cards">14pt Writable + AQ (C1S)</Link></li>
    <li><Link href="/product/metallic-foil-greeting-cards">Metallic Foil</Link></li>
    <li><Link href="/product/kraft-paper-greeting-cards">Kraft Paper</Link></li>
    <li><Link href="/product/spot-uv-greeting-cards">Spot UV</Link></li>
    <li><Link href="/product/pearl-paper-greeting-cards">Pearl Paper</Link></li>
  </ul>
</li>

{/* Invitations / Announcements */}
<li className="dropdown-item">
  <Link href="/category/print-products/invitations">Invitations / Announcements</Link>
  <ul className="sub-dropdown-menu">
    <li><Link href="/product/14pt-matte-invitations">14pt Matte Finish</Link></li>
    <li><Link href="/product/14pt-writable-aq-invitations">14pt Writable + AQ (C1S)</Link></li>
    <li><Link href="/product/14pt-aq-invitations">14pt AQ</Link></li>
    <li><Link href="/product/14pt-uv-invitations">14pt UV</Link></li>
    <li><Link href="/product/kraft-paper-invitations">Kraft Paper</Link></li>
    <li><Link href="/product/pearl-paper-invitations">Pearl Paper</Link></li>
    <li><Link href="/product/metallic-foil-invitations">Metallic Foil</Link></li>
  </ul>
</li>

{/* Numbered Tickets */}
<li className="dropdown-item">
  <Link href="/category/print-products/numbered-tickets">Numbered Tickets</Link>
  <ul className="sub-dropdown-menu">
    <li><Link href="/product/14pt-numbered-tickets">14pt Tickets</Link></li>
  </ul>
</li>

{/* Wall Calendars */}
<li className="dropdown-item">
  <Link href="/category/print-products/wall-calendars">Wall Calendars</Link>
  <ul className="sub-dropdown-menu">
    <li><Link href="/product/80lb-gloss-wall-calendars">80lb Gloss Text</Link></li>
    <li><Link href="/product/100lb-gloss-wall-calendars">100lb Gloss Text</Link></li>
  </ul>
</li>

{/* Variable Printing */}
<li className="dropdown-item">
  <Link href="/category/print-products/variable-printing">Variable Printing</Link>
  <ul className="sub-dropdown-menu">
    <li><Link href="/product/14pt-variable-printing">14pt Variable Printing</Link></li>
  </ul>
</li>

{/* Posters */}
<li className="dropdown-item">
  <Link href="/category/print-products/posters">Posters</Link>
  <ul className="sub-dropdown-menu">
    <li><Link href="/product/100lb-gloss-posters">100lb Gloss Text</Link></li>
    <li><Link href="/product/100lb-matte-posters">100lb + Matte Finish</Link></li>
    <li><Link href="/product/100lb-uv-posters">100lb + UV (High Gloss)</Link></li>
    <li><Link href="/product/80lb-enviro-posters">80lb Enviro Uncoated</Link></li>
    <li><Link href="/product/8pt-c2s-posters">8pt C2S</Link></li>
  </ul>
</li>

{/* Door Hangers */}
<li className="dropdown-item">
  <Link href="/category/print-products/door-hangers">Door Hangers</Link>
  <ul className="sub-dropdown-menu">
    <li><Link href="/product/14pt-matte-door-hangers">14pt + Matte Finish</Link></li>
    <li><Link href="/product/14pt-uv-door-hangers">14pt + UV (High Gloss)</Link></li>
    <li><Link href="/product/13pt-enviro-door-hangers">13pt Enviro Uncoated</Link></li>
    <li><Link href="/product/14pt-aq-door-hangers">14pt + AQ</Link></li>
  </ul>
</li>

{/* Digital Sheets */}
<li className="dropdown-item">
  <Link href="/category/print-products/digital-sheets">Digital Sheets</Link>
  <ul className="sub-dropdown-menu">
    <li><Link href="/product/14pt-matte-digital">14pt + Matte Finish</Link></li>
    <li><Link href="/product/13pt-enviro-digital">13pt Enviro Uncoated</Link></li>
    <li><Link href="/product/100lb-gloss-digital">100lb Gloss Text</Link></li>
    <li><Link href="/product/100lb-matte-digital">100lb + Matte Finish</Link></li>
    <li><Link href="/product/80lb-enviro-digital">80lb Enviro Uncoated</Link></li>
  </ul>
</li>

{/* Folded Business Cards */}
<li className="dropdown-item">
  <Link href="/category/print-products/folded-business-cards">Folded Business Cards</Link>
  <ul className="sub-dropdown-menu">
    <li><Link href="/product/14pt-matte-folded">14pt + Matte Finish</Link></li>
    <li><Link href="/product/14pt-uv-folded">14pt + UV (High Gloss)</Link></li>
    <li><Link href="/product/13pt-enviro-folded">13pt Enviro Uncoated</Link></li>
  </ul>
</li>

{/* Tent Cards */}
<li className="dropdown-item">
  <Link href="/category/print-products/tent-cards">Tent Cards</Link>
  <ul className="sub-dropdown-menu">
    <li><Link href="/product/14pt-matte-tent-cards">14pt + Matte Finish</Link></li>
  </ul>
</li>

{/* Plastics */}
<li className="dropdown-item">
  <Link href="/category/print-products/plastics">Plastics</Link>
  <ul className="sub-dropdown-menu">
    <li><Link href="/product/14pt-plastic">14pt Plastic</Link></li>
  </ul>
</li>

{/* Tear Cards */}
<li className="dropdown-item">
  <Link href="/category/print-products/tear-cards">Tear Cards</Link>
  <ul className="sub-dropdown-menu">
    <li><Link href="/product/14pt-matte-tear-cards">14pt + Matte Finish</Link></li>
    <li><Link href="/product/14pt-uv-tear-cards">14pt + UV (High Gloss)</Link></li>
    <li><Link href="/product/13pt-enviro-tear-cards">13pt Enviro Uncoated</Link></li>
  </ul>
</li>

{/* Clings */}
<li className="dropdown-item">
  <Link href="/category/print-products/clings">Clings</Link>
  <ul className="sub-dropdown-menu">
    <li><Link href="/product/transparent-clings">Transparent Clings</Link></li>
    <li><Link href="/product/white-opaque-clings">White Opaque Clings</Link></li>
  </ul>
</li>
</ul> {/* End of .sub-dropdown-menu for Presentation Folders */}
</li> {/* End of .dropdown-item for Presentation Folders */}
</ul> {/* End of .dropdown-menu for Print Products */}
</div> {/* End of .navbar-container */}
</nav>
  )
}
