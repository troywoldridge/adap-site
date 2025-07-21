export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer>
      <p>&copy; American Design And Printing {currentYear}. All Rights Reserved.</p>
    </footer>
  )
}
