var express = require('express');
const { log } = require('handlebars');
var router = express.Router();
const userHelpers = require('../helpers/user-helpers');
const productHelpers = require('../helpers/product-helpers');
const offerHelpers = require('../helpers/offer-helpers')
const { response } = require('express');
var collection = require('../config/collection')
var db = require('../config/connection')
var objectId = require('mongodb').ObjectId
const bannerHelpers = require('../helpers/banner-helpers');
const wishlistHelpers = require('../helpers/wishlist-helpers');
const couponHelpers = require('../helpers/coupon-helpers');
const e = require('express');





//verifyLogin middleware


const verifyLogin = async (req, res, next) => {
  if (req.session.user) {
    await userHelpers.isBlockedUser(req.session.user.email).then((response) => {
      if (response.isBlocked) {
        req.session.blockError = "You are blocked"
        req.session.user = null
        res.redirect('/login')
      } else {
        next();
      }
    })
  } else {
    // req.session.redirectUrl = req.originalUrl
    res.redirect("/login");
  }
};






//twilio credentials


const serviceSID = process.env.serviceSID
const accountSID = process.env.accountSID
const authToken = process.env.authToken
const client = require('twilio')(accountSID, authToken)   




//home page

router.get('/', async function (req, res, next) {
  let user = req.session.user
  let cartCount = null
  let wishlistCount = null
  if (req.session.user) {
    cartCount = await userHelpers.getCartCount(req.session.user._id)
    wishlistCount = await userHelpers.getWishlistCount(req.session.user._id)
  }
  let allBanners = await bannerHelpers.getAllBanners()
  let allProductshome = await productHelpers.getAllProductUser()


  res.render('user/index', { user, cartCount, allProductshome, allBanners, wishlistCount, passwordChanged: req.session.passwordChanged, referandearn: req.session.referandearn });
  req.session.passwordChanged = false
  req.session.referandearn = false
   
 
});



router.get('/about',(req,res)=>{
  res.render('user/about')
})






//signup get

router.get('/signup', (req, res) => {
  res.render('user/signup', { signupError: req.session.signupError })
  req.session.signupError = false
});




//signup post


router.post('/signup', (req, res) => {
  userHelpers.doSignup(req.body).then((response) => {
    if (response.status) {
      res.redirect('/login')
    } else if (response.referandearn) {
      req.session.referandearn = true
      res.redirect('/login')
    }
    else {
      req.session.signupError = "user already exist"
      res.redirect('/signup')
    }
  })
})


// login get


router.get('/login', (req, res) => {                                 //login routes to user/login page                                 
  let user = req.session.user
  if (user) {
    res.redirect('/')
  } else {
    res.render('user/login', {
      "loginError": req.session.loginError,
      "blockError": req.session.blockError,
    })
    req.session.blockError = false
    req.session.loginError = false
  }
})


//login post


router.post('/login', (req, res) => {
  userHelpers.doLogin(req.body).then((response) => {
    if (response.isBlocked) {
      req.session.blockError = "You are blocked"
      res.redirect("/login")
    } else {
      if (response.status) {                                          //if success redirect to login Page else redirect again login page 
        req.session.loggedIn = true
        req.session.user = response.user
        if (req.session.redirectUrl) {
          res.redirect(req.session.redirectUrl)
        } else {
          res.redirect('/')
        }
      } else {
        req.session.loginError = "Invalid email or password"
        res.redirect('/login')
      }
    }
  })
})



//logout get

router.get('/logout', (req, res) => {                           //destroying session while clicking logout
  req.session.user = null
  res.redirect('/login')
})

router.get('/otplogin', (req, res) => {

  try{
    req.session.forgotPassword = false
  res.render('user/otplogin', {
    checkMobileErr: req.session.checkMobileErr,
    otpblockError: req.session.otpblockError,
    invalidOtpError: req.session.invalidOtpError
  })
  req.session.checkMobileErr = false
  req.session.otpblockError = false
  req.session.invalidOtpError = false

  }catch{
    res.redirect('/login')
  }
  
})


// optlogin post


router.post('/otplogin', async (req, res) => {

  try{
    let user = await userHelpers.checkMobile(req.body.phone)
  req.session.temp = user
  await userHelpers.checkMobile(req.body.phone).then((response) => {
    if (user) {
      if (response.isBlocked) {
        req.session.otpblockError = "You are blocked by admin"
        res.redirect('/otplogin')
      } else {
        client.verify
          .services(serviceSID)                                             //otp login page post
          .verifications.create({
            to: `+91${req.body.phone}`,
            channel: "sms"
          })
          .then((response) => {
            res.render('user/enterotp', { phone: req.body.phone })
          }).catch((err) => {
            console.log('error');
          })
      }
    } else {
      req.session.checkMobileErr = "Mobile number not registered"
      res.redirect('/otplogin')
    }
  })
  }catch{
    res.redirect('/otplogin')
  }
  
  
})



router.get('/enterotp', (req, res) => {
  let user = req.session.user
  res.render('user/enterotp', { invalidOtpError: req.session.invalidOtpError, user,forgotPassword:req.session.forgotPassword })
  req.session.invalidOtpError = false
})




router.post('/enterotp', (req, res) => {

  try{


    let otp = req.body.otp
  let phone = req.body.phone
  console.log(otp);
  console.log(phone);
  console.log(req.session.forgotPassword);
  client.verify
    .services(serviceSID)
    .verificationChecks.create({
      to: `+91${phone}`,
      code: otp
    }).then((response) => {
      console.log('success');
      console.log(response);
      let valid = response.valid
      if (valid) {
        req.session.loggedIn = true;
        req.session.user = req.session.temp;
        if (req.session.forgotPassword) {
          res.redirect('/change-forgot-password')
        } else {
          res.redirect("/");
        }

      } else {
        req.session.invalidOtpError = true
        res.redirect('/otplogin')
      }
    }).catch((err) => {
      console.log(err);
    })

  }catch{

    res.redirect('/otplogin')

  }

  
})





router.get('/shop', async (req, res) => {

  try{
    let user = req.session.user
    let cartCount = null
    let wishlistCount = null
    if (req.session.user) {
      cartCount = await userHelpers.getCartCount(req.session.user._id)
      wishlistCount = await userHelpers.getWishlistCount(req.session.user._id)
    }
    let allProducts = await productHelpers.getAllProductUser()
    let todayDate = new Date().toISOString().slice(0, 10);
    let startProOffer = await offerHelpers.startProductOffer(todayDate);
    let startCatOffer = await offerHelpers.startCategoryOffer(todayDate)
  
    allProducts.forEach(async (element) => {
      if (element.stock <= 10 && element.stock != 0) {
        element.fewStock = true;
      } else if (element.stock == 0) {
        element.noStock = true;
      }
    });
  
  
    res.render('user/shop', { allProducts, user, cartCount, wishlistCount, todayDate, startProOffer, startCatOffer })

  }catch{
    res.redirect('/shop')
  }



})





router.get('/product/:id', async (req, res) => {
  let user = req.session.user
  let cartCount = null
  let wishlistCount = null
  if (req.session.user) {
    cartCount = await userHelpers.getCartCount(req.session.user._id)
    wishlistCount = await userHelpers.getWishlistCount(req.session.user._id)
  }
  productHelpers.viewProduct(req.params.id).then((response) => {
    allProductsUser = response
    if (allProductsUser.stock < 1) {
      var nostock = true
    }
    res.render('user/product2', { zoom: true, allProductsUser, user, wishlistCount, cartCount, nostock })
    nostock = false
  })
})





router.get('/add-to-cart/:id', verifyLogin, async(req, res) => {   
  let count = await userHelpers.findProCount(req.session.user._id,req.params.id)


  let stock = await userHelpers.findStock(req.params.id)
  if(count >= 3 ){
    res.json({limit:true})
  }
else{
  if(count == stock){
    res.json({noStock:true})
  }
   else{
    userHelpers.addToCart(req.params.id, req.session.user._id).then(() => {
      res.json({ status: true })
    })
   } 
}

  
   
})




router.get('/cart', verifyLogin, async (req, res) => {

  let cartCount = null
  let wishlistCount = null
  cartCount = await userHelpers.getCartCount(req.session.user._id)
  wishlistCount = await userHelpers.getWishlistCount(req.session.user._id)
  let products = await userHelpers.getCartProducts(req.session.user._id)
  let total = await userHelpers.getTotalAmount(req.session.user._id)
  res.render('user/cart', { products, user: req.session.user, total, cartCount, wishlistCount })
})




router.post('/change-product-quantity', async (req, res, next) => {


  await userHelpers.changeProductQuantity(req.body).then(async (response) => {
    response.total = await userHelpers.getTotalAmount(req.body.user)
    response.subtotals = await userHelpers.getCartSubTotal(req.body.user, req.body.product)

    var totalincart = response.total
    var subtotalincart = response.subtotals

    res.json(response)
  }).catch(() => {

    
    res.json({ noStock: true })
  })
})




router.get('/delete-cart-item/:cartId/:proId', (req, res) => {
  let cartId = req.params.cartId
  let proId = req.params.proId
  userHelpers.deleteCartItem(cartId, proId).then(() => {
    res.redirect('/cart')
  })
})




router.get('/place-order', verifyLogin, async (req, res) => {
  let todayDate = new Date().toISOString().slice(0, 10);
  let startCouponOffer = await couponHelpers.startCouponOffer(todayDate)
  let cartCount = null
  let wishlistCount = null
  cartCount = await userHelpers.getCartCount(req.session.user._id)
  wishlistCount = await userHelpers.getWishlistCount(req.session.user._id)
  let userAddress = await userHelpers.getAddress(req.session.user._id)
  let total = await userHelpers.getTotalAmount(req.session.user._id)
  // let startCatOffer=await offerHelper.startCategoryOffer(todayDate)


  let wallet = await userHelpers.findWallet(req.session.user._id)
  wallet = wallet.wallet

  if (wallet > total){
    walletstatus = true
  }else{
    walletstatus = false
  }
  res.render('user/place-order', { total, user: req.session.user, userAddress, startCouponOffer, cartCount, wishlistCount,walletstatus })
})




router.post('/place-order', async (req, res) => {


  let products = await userHelpers.getCartProductList(req.body.userId)
  let totalPrice = await userHelpers.getTotalAmount(req.body.userId)
  let wallet = await userHelpers.findWalletAmount(req.session.user._id)
  wallet = wallet.wallet
  if (req.session.couponTotal) {
    totalPrice = req.session.couponTotal
  }

  userHelpers.placeOrder(req.body, products, totalPrice).then((orderId) => {
    if (req.body['paymentMethod'] == 'COD') {
      req.session.couponTotal = null
      res.json({ codSuccess: true })
    }
    else if (req.body['paymentMethod'] == 'paypal') {
      userHelpers.generatePayal(orderId, totalPrice).then((link) => {
        req.session.couponTotal = null
        res.json({ link, paypal: true })
      })
    }
    else if (req.body['paymentMethod'] == 'wallet') {
      req.session.couponTotal = null
      userHelpers.reduceWallet(req.session.user, totalPrice, wallet).then(() => {
        res.json({ wallet: true });
      })
    }
    else {
      userHelpers.generateRazorpay(orderId, totalPrice).then((response) => {
        req.session.couponTotal = null
        res.json(response)
      })
    }
  })
})




router.post('/verify-payment', (req, res) => {
  userHelpers.verifyPayment(req.body).then(() => {
    userHelpers.changePaymentStatus(req.body['order[receipt]']).then(() => {
      console.log('payment successfull');
      res.json({ status: true })
    })
  }).catch((err) => {
    console.log('payment error');
    console.log(err);
    res.json({ status: false, errMsg: 'Payment failed' })
  })
})




router.get('/order-placed', verifyLogin, async (req, res) => {
  let cartCount = null
  let wishlistCount = null
  cartCount = await userHelpers.getCartCount(req.session.user._id)
  wishlistCount = await userHelpers.getWishlistCount(req.session.user._id)
  res.render('user/order-placed', { user: req.session.user, cartCount, wishlistCount })
})




router.get('/orders', verifyLogin, async (req, res) => {

  let cartCount = null
  let wishlistCount = null
  cartCount = await userHelpers.getCartCount(req.session.user._id)
  wishlistCount = await userHelpers.getWishlistCount(req.session.user._id)
  let orders = await userHelpers.getUserOrders(req.session.user._id)
  res.render('user/orders', { user: req.session.user, orders, cartCount, wishlistCount })
})




router.get('/view-order-products/:id', async (req, res) => {
  let cartCount = null
  let wishlistCount = null
  cartCount = await userHelpers.getCartCount(req.session.user._id)
  wishlistCount = await userHelpers.getWishlistCount(req.session.user._id)
  let products = await userHelpers.getOrderProducts(req.params.id)
  let track = await userHelpers.statusTrack(req.params.id)
  let orders = await userHelpers.getOrder(req.params.id)
  console.log(track.date)
  console.log('--------------------------------------------');
  res.render('user/status-track', { user: req.session.user, products, track, orders, cartCount, wishlistCount })
})



//cancel order
router.get("/cancel-order/:id", verifyLogin, async (req, res) => {
  let orderId = req.params.id;
  let id = req.session.user._id;

  userHelpers.cancelOrder(orderId).then(async () => {
    let wallet = await userHelpers.findWalletAmount(req.session.user._id)
    let order = await userHelpers.getOrder(orderId);
    if (order) {
      if (order.paymentMethod == "COD") {
        res.redirect("/orders");
      } else {
        if (wallet.wallet) {
          var amount = order.totalAmount + wallet.wallet
        } else {
          var amount = order.totalAmount;
        }
        userHelpers.setWallet(amount, orderId, id).then(() => {
          res.redirect('/orders')
        })
      }
    }
  });
});




router.get("/return-order/:id", verifyLogin, async (req, res) => {
  let id = req.session.user._id;
  let orderId = req.params.id;

  userHelpers.returnOrder(orderId).then(async () => {
    let wallet = await userHelpers.findWalletAmount(req.session.user._id)
    let order = await userHelpers.getOrder(orderId);
    // await userHelpers

    if (wallet.wallet) {
      var amount = order.totalAmount + wallet.wallet
    } else {
      var amount = order.totalAmount;
    }
    userHelpers.setWallet(amount, orderId, id).then(() => {
      res.redirect('/orders')
    })
  })
})





router.get('/sort/', async (req, res) => {
  let cartCount = null
  let wishlistCount = null
  if (req.session.user) {
    cartCount = await userHelpers.getCartCount(req.session.user._id)
    wishlistCount = await userHelpers.getWishlistCount(req.session.user._id)
  }


  sort = true
  if (req.query.sortby == 'low') {
    sortby = 1
  } else {
    sortby = -1
  }

  let sortedProducts = await userHelpers.sortproducts(sortby)
  sortedProducts.forEach(async (element) => {
    if (element.stock <= 10 && element.stock != 0) {
      element.fewStock = true;
    } else if (element.stock == 0) {
      element.noStock = true;
    }
  });
  res.render('user/shop', { sortedProducts, user: req.session.user, sort, cartCount, wishlistCount })
  sort = false

})





router.get('/filter', async (req, res) => {
  let cartCount = null
  let wishlistCount = null
  if (req.session.user) {
    cartCount = await userHelpers.getCartCount(req.session.user._id)
    wishlistCount = await userHelpers.getWishlistCount(req.session.user._id)
  }
  let filter = req.query.filterby
  await userHelpers.filterFunction(filter).then((response) => {
    filtered = response
    res.render('user/shop', { filtered, user: req.session.user, cartCount, wishlistCount })
  })
})





router.post('/filter', async (req, res) => {

  let user = req.session.user
  filter = req.body.filter
  await userHelpers.filterFunction(filter).then((response) => {
    filtered = response
    res.render('user/shop', { filtered, user })
  })
})





router.get('/forgotPassword', (req, res) => {
  req.session.forgotPassword = true
  res.render('user/otplogin', { forgotPassword: req.session.forgotPassword })
})




router.get('/add-to-wishlist/:id', verifyLogin, (req, res) => {
  let proId = req.params.id
  let userId = req.session.user._id
  wishlistHelpers.addToWishlist(userId, proId).then(() => {
    res.json({ status: true })
  }).catch(() => {
    res.json({ status: false })
  })
})




router.get('/wishlists', verifyLogin, async (req, res) => {
  let cartCount = null
  let wishlistCount = null
  cartCount = await userHelpers.getCartCount(req.session.user._id)
  wishlistCount = await userHelpers.getWishlistCount(req.session.user._id)
  let user = req.session.user
  let products = await wishlistHelpers.getWishlists(req.session.user._id)
  res.render('user/wishlists', { user, products, cartCount, wishlistCount })
})




router.get('/remove-wishlist/:id', verifyLogin, async (req, res) => {
  await wishlistHelpers.removeWishlist(req.params.id, req.session.user._id).then((response) => {
    res.json({ status: true })
  })
})




router.get('/user-profile', verifyLogin, async (req, res) => {
  let userDetails = await userHelpers.getUserDetails(req.session.user._id)
  let cartCount = null
  cartCount = await userHelpers.getCartCount(req.session.user._id)
  let wallet = await userHelpers.findWallet(req.session.user._id);
  wallet = wallet.wallet
  res.render('user/userprofilelatest', { user: req.session.user, wallet, userDetails, passwordError: req.session.passwordError, passwordChanger: req.session.passwordChanger, cartCount })
  req.session.passwordError = false
  req.session.passwordChanger = false

})



router.post('/add-address', verifyLogin, (req, res) => {
  userHelpers.addAddress(req.body, req.session.user._id).then(() => {
    res.redirect('/user-profile')
  })
})




router.get('/delete-address/:id', verifyLogin, (req, res) => {
  userHelpers.deleteAddress(req.params.id, req.session.user._id).then(() => {
    res.redirect('/user-profile')
  })
})




router.post('/change-password', verifyLogin, (req, res) => {
  userHelpers.passwordChanger(req.session.user.email, req.body.password, req.body.newpassword).then((response) => {
    req.session.passwordChanger = true
    res.redirect('/user-profile')
  }).catch(() => {
    req.session.passwordError = 'invalid password';
    res.redirect('/user-profile')
  })
})




router.post('/edit-profile', verifyLogin, (req, res) => {
  userHelpers.editProfile(req.body, req.session.user).then(() => {
    res.redirect('/user-profile')
  }).catch(() => {
    res.redirect('/user-profile')

  })
})




router.get('/change-forgot-password', verifyLogin, (req, res) => {
  res.render('user/change-password')
  req.session.forgotPassword = false
})




router.post('/change-forgot-password', verifyLogin, (req, res) => {
  userHelpers.changeForgotPassword(req.body.password, req.session.user._id).then(() => {
    req.session.passwordChanged = 'password changed successfully'
    res.redirect('/')
  })
})



// coupon apply
router.post('/coupon-apply', verifyLogin, async (req, res) => {
  let couponCode = req.body.coupon
  let userId = req.session.user._id
  let totalPrice = await userHelpers.getTotalAmount(userId);



  await couponHelpers.validateCoupon(couponCode, userId, totalPrice).then((response) => {
    req.session.couponTotal = response.total
    if (response.success) {
      res.json({ couponSuccess: true, total: response.total, discountValue: response.discountValue, couponCode })
    } else if (response.couponUsed) {
      res.json({ couponUsed: true })
    } else if (response.couponExpired) {
      res.json({ couponExpired: true })
    } else {
      res.json({ invalidCoupon: true })
    }

  })
})



// invoice
router.get('/invoice/:id', verifyLogin, async (req, res) => {
  let user = req.session.user
  let orderId = req.params.id
  let invoice = await userHelpers.getUserInvoice(req.params.id)
  let products = await userHelpers.getOrderProducts(req.params.id)
  let orders = await userHelpers.getOrderDetails(orderId)
  res.render('user/invoice', { user, invoice, products, orders })
})



router.post('/edit-address', (req, res) => {
  let userId = req.session.user._id
  userHelpers.editAddress(req.body, userId).then((response) => {
    res.json({ status: true })
  })
})


// edit profile pic 
router.post("/edit-profile-pic", verifyLogin, (req, res) => {
  let image = req.files.image;
  let id = req.session.user._id;
  image.mv("./public/profile-images/" + id + ".jpg");
  res.redirect("/user-profile");
});

module.exports = router;