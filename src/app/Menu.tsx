import { useState, useEffect } from 'react'
import './Pages.css'
import './Menu.css'
import CheckoutModal from '../component/CheckoutModal'
import { supabase } from '../lib/supabase'
import { formatCurrency } from '../lib/currency'


interface MenuItem {
  id: string
  category_id: string | null
  item: string
  portion: string
  description: string
  price: number
}

interface Category {
  id: string
  category_name: string
}


interface CartEntry {
  id: string
  name: string
  qty: number
  amount: number
}



export default function Menu() {

  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [menuLoading, setMenuLoading] = useState(true)

  const [cart, setCart] = useState<CartEntry[]>([])

  const [added, setAdded] = useState<Record<string, boolean>>({})

  const [showCheckout, setShowCheckout] = useState(false)
  const [checkoutMessage, setCheckoutMessage] = useState('')

  useEffect(() => {
    async function fetchMenu(){
      setMenuLoading(true)

      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('id, category_name')
        .order('category_name')

      const { data, error } = await supabase
        .from('menu_items')
        .select(`
          id,
          category_id,
          item,
          portion,
          description,
          price
        `)
        .eq('status', true)
        .order('item')


      if (!categoriesError && categoriesData) {
        setCategories(categoriesData)
      } else if (categoriesError) {
        console.error('Failed to fetch categories:', categoriesError)
      }


      if (!error && data) {
        setMenuItems(data)
      } else if (error) {
        console.error('Failed to fetch menu items:', error)
      }

      setMenuLoading(false)

    }


    fetchMenu()

  },[])



  const categoryNameById = new Map(
    categories.map((category) => [category.id, category.category_name])
  )

  const groupedMenu = Array.from(
    menuItems.reduce((groups, item) => {
      const categoryKey = item.category_id || 'uncategorized'
      const categoryName = item.category_id
        ? categoryNameById.get(item.category_id) || 'Uncategorized'
        : 'Uncategorized'

      if (!groups.has(categoryKey)) {
        groups.set(categoryKey, {
          key: categoryKey,
          name: categoryName,
          items: [] as MenuItem[],
        })
      }

      groups.get(categoryKey)?.items.push(item)
      return groups
    }, new Map<string, { key: string; name: string; items: MenuItem[] }>() ).values()
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

  async function handleCheckoutClick() {
    const {
      data: { user },
      error
    } = await supabase.auth.getUser()

    if (error || !user) {
      setCheckoutMessage('Please sign in or log in before placing an order.')
      return
    }

    setCheckoutMessage('')
    setShowCheckout(true)
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

                      {formatCurrency(item.amount)} each

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

                    {formatCurrency(item.amount * item.qty)}

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

                {formatCurrency(grandTotal)}

              </span>


            </div>




            <div className="checkout-action">
              <button className="btn-checkout-full" onClick={handleCheckoutClick}>
                Proceed to Checkout →
              </button>

              {checkoutMessage && (
                <p className="checkout-message">
                  {checkoutMessage}
                </p>
              )}
            </div>



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

                          {formatCurrency(menuItem.price)}

                        </span>
                        <div className="menu-item-actions">
                          <button
                            className={`menu-btn-cart ${added[menuItem.id] ? 'added' : ''}`}
                            onClick={() => handleAddToCart(menuItem)}
                          >
                            {added[menuItem.id] ? '✓ Added' : '+ Cart'}
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
        }}


      />

    }



    </>

  )

}