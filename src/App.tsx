import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './component/Navbar'
import Footer from './component/Footer'
import Home from './app/Home'
import OurCafe from './app/OurCafe'
import Menu from './app/Menu'
import MyOrders from './app/MyOrders'
import Contact from './app/Contact'
import OurLegacy from './app/OurLegacy'
import AdminPanel from './app/admin/AdminPanel'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin/*" element={<AdminPanel />} />
        <Route path="/*" element={
          <>
            <Navbar />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/our-cafe" element={<OurCafe />} />
              <Route path="/menu" element={<Menu />} />
              <Route path="/my-orders" element={<MyOrders />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/our-legacy" element={<OurLegacy />} />
            </Routes>
            <Footer />
          </>
        } />
      </Routes>
    </BrowserRouter>
  )
}

export default App
