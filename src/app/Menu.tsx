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
  category: string
  item: string
  portion: string
  description: string
  price: number
}


interface CartEntry {
  id: string
  name: string
  qty: number
  amount: number
}



export default function Menu() {

  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [menuLoading, setMenuLoading] = useState(true)

  const [cart, setCart] = useState<CartEntry[]>([])

  const [added, setAdded] = useState<Record<string, boolean>>({})

  const [showCheckout, setShowCheckout] = useState(false)
  const [orders, setOrders] = useState<any[]>([]);
const [loadingOrders, setLoadingOrders] = useState(false);

  async function fetchOrders() {

  setLoadingOrders(true);

  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();


  if (authError || !user) {
    console.error("User not logged in");
    setLoadingOrders(false);
    return;
  }


  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      order_items(*)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });


  if (error) {
    console.error(error);
    setLoadingOrders(false);
    return;
  }


  setOrders(data || []);
  setLoadingOrders(false);
}

  useEffect(() => {
    fetchOrders();

    async function fetchMenu(){

      const {data,error} = await supabase
        .from('menu_items')
        .select('id, category, item, portion, description, price')
        .eq('status',true)
        .order('category')
        .order('item')


      if(!error && data){
        setMenuItems(data)
      }

      setMenuLoading(false)

    }


    fetchMenu()

  },[])



  const categories = Array.from(
    new Set(menuItems.map(item=>item.category))
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



      <button className="admin-btn-primary-orders">
        Order History
      </button>

      <div className="order-history">

  <h2>My Orders</h2>


  {loadingOrders ? (
    <p>Loading orders...</p>
  ) : orders.length === 0 ? (
    <p>No orders found.</p>
  ) : (

    orders.map((order) => (

      <div className="order-card" key={order.order_id}>

        <div className="order-header">
          <h3>
            Order #{order.order_id}
          </h3>

          <span>
            {new Date(order.created_at).toLocaleDateString()}
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
          {order.order_items.map((item:any) => (

            <li key={item.id}>
              {item.item_name} × {item.quantity}
              - ₹{item.amount * item.quantity}
            </li>

          ))}
        </ul>


      </div>

    ))

  )}

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


                    <button onClick={() => decrement(item.id)}>
                      -
                    </button>



                    <span className="cart-qty">

                      {item.qty}

                    </span>




                    <button onClick={() => increment(item.id)}>
                      +
                    </button>


                  </div>




                  <span className="cart-item-subtotal">

                    ₹{item.amount * item.qty}

                  </span>




                 <button onClick={() => removeItem(item.id)}>
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




            <button onClick={() => setShowCheckout(true)}>
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

        categories.map(category=>{


          const items =
            menuItems.filter(
              item=>item.category===category
            )



          return (

            <section

              className="menu-section"

              key={category}

            >


              <h2 className="menu-category">

                <span>
                  {CATEGORY_ICONS[category] ?? '☕'}
                </span>

                {category}

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


        onSuccess={()=>
          setCart([])
        }


      />

    }



    </>

  )

}