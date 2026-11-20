import { BrowserRouter, Routes, Route, Outlet, Link } from 'react-router-dom'
import Navbar from './component/Navbar'
import Footer from './component/Footer'
import Home from './app/Home'
import OurCafe from './app/OurCafe'
import Menu from './app/Menu'
import MyOrders from './app/MyOrders'
import Contact from './app/Contact'
import OurLegacy from './app/OurLegacy'
import AdminPanel from './app/admin/AdminPanel'

function SiteLayout() {
  return (
    <>
      <Navbar />
      <Outlet />
      <Footer />
    </>
  )
}

function NotFound() {
  return (
    <main className="page inner-page not-found-page">
      <div className="page-header">
        <span className="page-eyebrow">Taste of Ceylon</span>
        <h1>Page not found</h1>
        <div className="divider" />
        <p className="page-desc">We couldn’t find the page you requested.</p>
        <Link className="btn-primary not-found-link" to="/">Return home</Link>
      </div>
    </main>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin" element={<AdminPanel />} />
        <Route element={<SiteLayout />}>
          <Route index element={<Home />} />
          <Route path="our-cafe" element={<OurCafe />} />
          <Route path="menu" element={<Menu />} />
          <Route path="my-orders" element={<MyOrders />} />
          <Route path="contact" element={<Contact />} />
          <Route path="our-legacy" element={<OurLegacy />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
