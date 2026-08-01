import { useState, useEffect } from 'react'
import './Pages.css'
import './Menu.css'
import CheckoutModal from '../component/CheckoutModal'
import { supabase } from '../lib/supabase'

const CATEGORY_ICONS: Record<string, string> = {
  'Espresso & Coffee': '☕',
  'Specialty Drinks': '✨',
  'Food & Bakes': '🥐',
}


interface MenuItem {
  id: string
  category_id: string | null
  item: string
  portion: string
  description: string
  price: number
  categories: {
    id: string
    category_name: string
  } | {
    id: string
    category_name: string
  }[] | null
}


interface CartEntry {
  id: string
  name: string
  qty: number
  amount: number
}

interface OrderItem {
  id: number
  item_name: string
  quantity: number
  amount?: number | null
}

interface Order {
  order_id: number
  order_type: 'Takeaway' | 'Dine In'
  total_value: number | string
  order_time: string
  payment_status: boolean
  processing_status: boolean
  is_ready: boolean
  delivery_status: boolean
  order_items: OrderItem[] | null
}

function getPaymentStatus(order: Order) {
  return order.payment_status ? 'Paid' : 'Pending'
}

function getProcessingStatus(order: Order) {
  if (order.is_ready) return 'Completed'
  if (order.processing_status) return 'Preparing'
  return 'Pending'
}

function getDeliveryStatus(order: Order) {
  return order.delivery_status ? 'Delivered' : 'Pending'
}

function getCategoryRef(item: MenuItem) {
  if (!item.categories) return null
  return Array.isArray(item.categories)
    ? item.categories[0] || null
    : item.categories
}



export default function Menu() {

  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [menuLoading, setMenuLoading] = useState(true)

  const [cart, setCart] = useState<CartEntry[]>([])

  const [added, setAdded] = useState<Record<string, boolean>>({})

  const [showCheckout, setShowCheckout] = useState(false)
  const [showOrderHistory, setShowOrderHistory] = useState(false)
  const [orders, setOrders] = useState<Order[]>([])
  const [loadingOrders, setLoadingOrders] = useState(false)

  async function fetchOrders() {

    setLoadingOrders(true)

    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()


    if (authError || !user) {
      console.error('User not logged in')
      setOrders([])
      setLoadingOrders(false)
      return
    }


    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items(*)
      `)
      .eq('user_id', user.id)
      .order('order_time', { ascending: false })


    if (error) {
      console.error(error)
      setLoadingOrders(false)
      return
    }


    setOrders(data || [])
    setLoadingOrders(false)
  }

  useEffect(() => {
    fetchOrders();

    async function fetchMenu(){

      const { data, error } = await supabase
        .from('menu_items')
        .select(`
          *,
          categories (
            id,
            category_name
          )
        `)
        .eq('status', true)
        .order('item')


      if (!error && data) {
        setMenuItems(data)
      } else if (error) {
        console.error('Failed to fetch menu items:', error)
      }

      setMenuLoading(false)

    }


    fetchMenu()

  },[])



  const groupedMenu = Array.from(
    menuItems.reduce((groups, item) => {
      const relatedCategory = getCategoryRef(item)
      const categoryName = relatedCategory?.category_name || 'Uncategorized'
      const categoryKey = relatedCategory?.id || item.category_id || 'uncategorized'

      if (!groups.has(categoryKey)) {
        groups.set(categoryKey, {
          key: categoryKey,
          name: categoryName,
          icon: CATEGORY_ICONS[categoryName] || '☕',
          items: [] as MenuItem[],
        })
      }

      groups.get(categoryKey)?.items.push(item)
      return groups
    }, new Map<string, { key: string; name: string; icon: string; items: MenuItem[] }>() ).values()
  )

  function handleAddToCart(menuItem:MenuItem){


    setCart((prev)=>{

      const existing = prev.find(
        item=>item.id === menuItem.id
      )


      if(existing){

        return prev.map(item=>

          item.id === menuItem.id

          ? {
              ...item,
              qty:item.qty+1
            }

          : item

        )

      }



      return [

        ...prev,

        {
          id:menuItem.id,
          name:menuItem.item,
          qty:1,
          amount:menuItem.price
        }

      ]


    })


    setAdded(prev=>({
      ...prev,
      [menuItem.id]:true
    }))


    setTimeout(()=>{

      setAdded(prev=>({
        ...prev,
        [menuItem.id]:false
      }))

    },1200)


  }





  function increment(id:string){

    setCart(prev=>

      prev.map(item=>

        item.id === id

        ? {
            ...item,
            qty:item.qty+1
          }

        : item

      )

    )

  }




  function decrement(id:string){

    setCart(prev=>

      prev
      .map(item=>

        item.id === id

        ? {
            ...item,
            qty:item.qty-1
          }

        : item

      )
      .filter(item=>item.qty>0)

    )

  }





  function removeItem(id:string){

    setCart(prev=>

      prev.filter(item=>item.id!==id)

    )

  }





  const totalItems = cart.reduce(
    (sum,item)=>sum+item.qty,
    0
  )


  const grandTotal = cart.reduce(
    (sum,item)=>
      sum+(item.amount*item.qty),
    0
  )

  const activeOrders = orders.filter(order => !order.delivery_status)

  



  return (

    <>

    <main className="page inner-page">


      <div className="page-header">

        <span className="page-eyebrow">
          What We Serve
        </span>

        <h1>
          Menu
        </h1>

        <div className="divider"/>

        <p className="page-desc">
          Seasonal, honest, and made with care.
        </p>

      </div>

      <div className="order-history">

  <div className="order-history-header">
    <h2>My Orders</h2>

    <button className="admin-btn-primary-orders" onClick={() => setShowOrderHistory(true)}>
      Order History
    </button>
  </div>


  {loadingOrders ? (
    <p>Loading orders...</p>
  ) : activeOrders.length === 0 ? (
    <p>No active orders found.</p>
  ) : (

    activeOrders.map((order) => (

      <div className="order-card" key={order.order_id}>

        <div className="order-header">
          <h3>
            Order #{order.order_id}
          </h3>

          <span>
            {new Date(order.order_time).toLocaleDateString()}
          </span>
        </div>

        <div className="order-status-row">
          <span className={`order-status-badge ${order.payment_status ? 'is-paid' : 'is-pending'}`}>
            Payment: {getPaymentStatus(order)}
          </span>

          <span className={`order-status-badge ${order.is_ready ? 'is-ready' : order.processing_status ? 'is-progress' : 'is-pending'}`}>
            Kitchen: {getProcessingStatus(order)}
          </span>

          <span className={`order-status-badge ${order.delivery_status ? 'is-ready' : 'is-pending'}`}>
            Delivery: {getDeliveryStatus(order)}
          </span>
        </div>


        <p>
          Type: {order.order_type}
        </p>

        <p>
          Total: ₹{order.total_value}
        </p>


        <h4>Items</h4>

        <ul>
          {(order.order_items ?? []).map((item) => (

            <li key={item.id}>
              {item.item_name} × {item.quantity}
              {item.amount != null ? ` - ₹${item.amount * item.quantity}` : ''}
            </li>

          ))}
        </ul>


      </div>

    ))

  )}



        {
          showOrderHistory &&

          <div
            className="order-history-modal-overlay"
            onClick={(event) => {
              if (event.target === event.currentTarget) {
                setShowOrderHistory(false)
              }
            }}
          >

            <div className="order-history-modal" role="dialog" aria-modal="true" aria-label="Order history">

              <div className="order-history-modal-header">
                <div>
                  <span className="page-eyebrow">
                    Your Order
                  </span>

                  <h2>
                    Order History
                  </h2>
                </div>

                <button
                  className="order-history-close"
                  onClick={() => setShowOrderHistory(false)}
                  aria-label="Close order history"
                >
                  ✕
                </button>
              </div>


              <div className="order-history-modal-body">

                {loadingOrders ? (
                  <p>Loading orders...</p>
                ) : orders.length === 0 ? (
                  <p>No orders found.</p>
                ) : (

                  orders.map((order) => (

                    <div className="order-card order-card-history" key={`history-${order.order_id}`}>

                      <div className="order-header">
                        <h3>
                          Order #{order.order_id}
                        </h3>

                        <span>
                          {new Date(order.order_time).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="order-status-row">
                        <span className={`order-status-badge ${order.payment_status ? 'is-paid' : 'is-pending'}`}>
                          Payment: {getPaymentStatus(order)}
                        </span>

                        <span className={`order-status-badge ${order.is_ready ? 'is-ready' : order.processing_status ? 'is-progress' : 'is-pending'}`}>
                          Kitchen: {getProcessingStatus(order)}
                        </span>

                        <span className={`order-status-badge ${order.delivery_status ? 'is-ready' : 'is-pending'}`}>
                          Delivery: {getDeliveryStatus(order)}
                        </span>
                      </div>


                      <p>
                        Type: {order.order_type}
                      </p>

                      <p>
                        Total: ₹{order.total_value}
                      </p>


                      <h4>Items</h4>

                      <ul>
                        {(order.order_items ?? []).map((item) => (

                          <li key={item.id}>
                            {item.item_name} × {item.quantity}
                            {item.amount != null ? ` - ₹${item.amount * item.quantity}` : ''}
                          </li>

                        ))}
                      </ul>


                    </div>

                  ))

                )}

              </div>

            </div>

          </div>

        }


</div>



      {
        cart.length > 0 &&

        <div className="cart-panel">


          <div className="cart-panel-header">

            <span className="cart-panel-title">

              🛒 Your Order

              <span className="cart-total-badge">

                {totalItems} item
                {totalItems>1?'s':''}

              </span>

            </span>



            <button

              className="cart-clear-btn"

              onClick={()=>setCart([])}

            >

              Clear all

            </button>


          </div>






          <ul className="cart-list">


            {
              cart.map(item=>(


                <li

                  className="cart-list-item"

                  key={item.id}

                >


                  <div className="cart-item-name">

                    <span>
                      {item.name}
                    </span>


                    <span className="cart-item-unit-price">

                      ₹{item.amount} each

                    </span>


                  </div>




                  <div className="cart-item-controls">


                    <button className="cart-qty-btn" onClick={() => decrement(item.id)}>
                      -
                    </button>



                    <span className="cart-qty">

                      {item.qty}

                    </span>




                    <button className="cart-qty-btn" onClick={() => increment(item.id)}>
                      +
                    </button>


                  </div>




                  <span className="cart-item-subtotal">

                    ₹{item.amount * item.qty}

                  </span>




                 <button className="cart-remove-btn" onClick={() => removeItem(item.id)}>
                    ✕
                  </button>



                </li>


              ))
            }


          </ul>





          <div className="cart-panel-footer">


            <div className="cart-grand-total">

              <span>
                Total
              </span>


              <span className="cart-total-amount">

                ₹{grandTotal}

              </span>


            </div>




            <button className="btn-checkout-full" onClick={() => setShowCheckout(true)}>
              Proceed to Checkout →
            </button>



          </div>


        </div>

      }






      {
        menuLoading

        ?

        <p style={{
          textAlign:'center',
          color:'#7a5c3e',
          padding:'60px 0'
        }}>

          Loading menu...

        </p>


        :

        groupedMenu.map((group) => {


          const items = group.items



          return (

            <section

              className="menu-section"

              key={group.key}

            >


              <h2 className="menu-category">

                <span>
                  {group.icon}
                </span>

                {group.name}

              </h2>




              <div className="menu-grid">


                {
                  items.map(menuItem=>(


                    <div

                      className="menu-item"

                      key={menuItem.id}

                    >



                      <div className="menu-item-info">


                        <h3>
                          {menuItem.item}
                        </h3>



                        {
                          menuItem.portion &&

                          <span className="menu-item-portion">

                            {menuItem.portion}

                          </span>

                        }




                        <p>

                          {menuItem.description}

                        </p>


                      </div>





                      <div className="menu-item-right">


                        <span className="menu-price">

                          ₹{menuItem.price}

                        </span>




                        <div className="menu-item-actions">


                          <button
                            className={`menu-btn-cart ${added[menuItem.id] ? 'added' : ''}`}
                            onClick={() => handleAddToCart(menuItem)}
                          >
                            {added[menuItem.id] ? '✓ Added' : '+ Cart'}
                          </button>




                          <button className="menu-btn-buy">

                            Buy Now

                          </button>


                        </div>



                      </div>




                    </div>


                  ))
                }


              </div>



            </section>


          )


        })


      }




    </main>





    {
      showCheckout &&


      <CheckoutModal


        cart={cart}


        grandTotal={grandTotal}


        onClose={()=>
          setShowCheckout(false)
        }


        onSuccess={() => {
          setCart([])
          fetchOrders()
        }}


      />

    }



    </>

  )

}