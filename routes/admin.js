var express = require('express');
var router = express.Router();
const adminHelpers = require('../helpers/admin-helpers');
const productHelpers = require('../helpers/product-helpers');
const bannerHelpers = require('../helpers/banner-helpers')
const dashboardHelpers = require('../helpers/dashboard-helpers')
const offerHelpers = require('../helpers/offer-helpers')
const couponHelpers = require('../helpers/coupon-helpers')
var db = require('../config/connection');
const { route } = require('./user');
const { compareSync } = require('bcrypt');
const { response } = require('express');
const userHelpers = require('../helpers/user-helpers');
const { ReservationContext } = require('twilio/lib/rest/taskrouter/v1/workspace/task/reservation');
var fs = require('fs')



//verify login for admin
const verifyAdminLogin = (req, res, next) => {
  if (req.session.admin) {
    next()
  } else {
    res.redirect('/admin/admin-login')
  }
}

// setting layout for admin side seperate...
const setAdminLayout = (req, res, next) => {
  res.locals.layout = 'layout2'
  next()
}
// using admin layout...
router.use(setAdminLayout)
/* GET users listing. */
// router.get('/', verifyAdminLogin, function (req, res, next) {
//   adminHelpers.getAllUser().then((allUsers) => {
//     let adminsession = req.session.admin
//     console.log('adminloggedin');
//     res.render('admin/dashboard', { admin: true, adminsession })
//     // res.render('admin/view-user', { admin: true, allUsers, adminsession });
//   })
// })



router.get('/', verifyAdminLogin, async function (req, res, next) {
  let adminsession = req.session.admin
  let userCount = await dashboardHelpers.getUsersCount()
  let orderCount = await dashboardHelpers.totalOrders()
  let productCount = await dashboardHelpers.totalProducts()
  let cancelCount = await dashboardHelpers.cancelTotal()
  let dailyRevenue = await dashboardHelpers.dailyRevenue()
  let totalRevenue = await dashboardHelpers.totalRevenue()
  let weeklyRevenue = await dashboardHelpers.weeklyRevenue()
  let yearlyRevenue = await dashboardHelpers.yearlyRevenue()
  res.render('admin/dashboard', { admin: true, adminsession, userCount, orderCount, productCount, cancelCount, dailyRevenue, totalRevenue, weeklyRevenue, yearlyRevenue })
})



router.get('/sales-management', verifyAdminLogin, async (req, res) => {
  let data = await adminHelpers.monthlyReport()
  let daily = await adminHelpers.dailyReport()
  let weekly = await adminHelpers.weeklyReport()
  let yearly = await adminHelpers.yearlyReport()
  // console.log("daily start  jjjjjjjjjjjjjjjjjjjjjjjjj");
  // console.log(daily,"this is daily");
  res.render('admin/sales-management', { admin: true, adminsession: req.session.admin, data, daily, weekly, yearly })
})



router.post('/custom-report', verifyAdminLogin, async (req, res) => {

  let start = req.body.starting
  let end = req.body.ending
  let data = await adminHelpers.getReport(start, end)
  let daily = await adminHelpers.dailyReport()
  let weekly = await adminHelpers.weeklyReport()
  let yearly = await adminHelpers.yearlyReport()
  res.render('admin/sales-management', { admin: true, adminsession: req.session.admin, data, daily, weekly, yearly })

})




router.post('/inventory', (req, res) => {
  productHelpers.updateStock(req.body.id, req.body.stock).then(() => {
    res.redirect('/admin/inventory')
  })
})



router.get('/view-user', verifyAdminLogin, (req, res) => {
  let adminsession = req.session.admin
  adminHelpers.getAllUser().then((allUsers) => {
    res.render('admin/view-user', { admin: true, allUsers, adminsession });
  })
})


router.get('/add-user', verifyAdminLogin, (req, res) => {
  let adminsession = req.session.admin
  if (adminsession) {
    res.render('admin/add-user', { addUserError: req.session.addUserError, admin: true, adminsession })
    req.session.addUserError = false
  } else {
    res.redirect('/login')
  }

  //res.render('admin/add-user')                                                   
})



router.post('/add-user', verifyAdminLogin, function (req, res, next) {              //calling addUser function while submitting the adduserform  result is a callback

  adminHelpers.addUser(req.body).then((response) => {           //passing user details req.body to addUser function
    console.log(response);
    if (response) {
      res.redirect('/admin')
    } else {
      req.session.addUserError = "entered mail is already exist"
      res.redirect('/admin/add-user')
    }

  })
})



router.get('/delete-user/:email', verifyAdminLogin, (req, res) => {
  let userEmail = req.params.email                                //deletting user data
  console.log(userEmail);
  adminHelpers.deleteUser(userEmail).then((response) => {
    res.redirect('/admin')
  })

})



router.get('/edit-user/:email', verifyAdminLogin, async (req, res) => {                //editting user data
  let adminsession = req.session.admin
  if (adminsession) {
    let userMail = req.params.email
    console.log(req.params.email);
    // this user is passed to edit page to set value fields
    let user = await db.get().collection('user').findOne({ email: userMail })
    console.log(user);
    //provide get method only,post method same as add-users
    res.render('admin/edit-user', { user, admin: true, adminsession })
  }
  else {
    res.redirect('/login')
  }

})


router.post('/edit-user/:email', verifyAdminLogin, (req, res) => {                        //user edited
  adminHelpers.editUser(req.params.email, req.body).then(() => {
    res.redirect('/admin')
  })
})



router.get('/admin-login', (req, res) => {
  let adminsession = req.session.admin
  if (adminsession) {
    res.redirect('/admin')
  } else {
    res.render('admin/admin-login', { admin: true, adminLoginError: req.session.adminLoginError })
    req.session.adminLoginError = false
  }
})



router.post('/admin-login', (req, res) => {
  adminHelpers.adminLogin(req.body).then((response) => {
    if (response.status) {
      req.session.loggedIn = true
      req.session.admin = response.admin
      console.log(req.session.admin);
      res.redirect('/admin')
    } else {
      req.session.adminLoginError = "invalid email or password"
      res.redirect('/admin/admin-login')
    }
  })
})



router.get('/admin-logout', (req, res) => {
  // req.session.destroy(()=>{
  req.session.admin = null
  res.redirect('/admin/admin-login')
  // })
})




router.get('/add-product', verifyAdminLogin, (req, res) => {
  let adminsession = req.session.admin
  adminHelpers.getAllCategory().then((response) => {
    category = response
    active = true
    res.render('admin/add-product', { adminsession, category, productError: req.session.productError, active })
    req.session.productError = false
    active = false
  })
})




router.post('/add-product', verifyAdminLogin, function (req, res, next) {
  productHelpers.addProduct(req.body).then((response) => {
    let id = response.insertedId;
    let image1 = req.files.image1
    let image2 = req.files.image2
    let image3 = req.files.image3
    let image4 = req.files.image4
    image1.mv("./public/product-image/" + id + "1.jpg");
    image2.mv("./public/product-image/" + id + "2.jpg");
    image3.mv("./public/product-image/" + id + "3.jpg");
    image4.mv("./public/product-image/" + id + "4.jpg");
    res.redirect("/admin/view-product")
  })
    .catch(() => {
      req.session.productError = "Product already exists"
      console.log(req.session.productError);
      res.redirect("/admin/add-product")
    })
})



router.get("/view-product", verifyAdminLogin, function (req, res) {
  let adminsession = req.session.admin
  if (adminsession) {
    productHelpers.getAllProduct().then((response) => {
      let allproducts = response
      res.render('admin/view-product', { allproducts, adminsession })
    })

  } else {
    res.redirect('/admin/admin-login')
  }
})




router.get('/delete-product/:id', verifyAdminLogin, (req, res) => {
  let productId = req.params.id                                //deletting user data
  console.log(productId);
  productHelpers.deleteProduct(productId).then((response) => {
    res.redirect('/admin/view-product')
    fs.unlinkSync("./public/product-image/" + productId + "1.jpg")
    fs.unlinkSync("./public/product-image/" + productId + "2.jpg")
    fs.unlinkSync("./public/product-image/" + productId + "3.jpg")
    fs.unlinkSync("./public/product-image/" + productId + "4.jpg")
  })

})




router.get('/edit-product/:id', verifyAdminLogin, async (req, res) => {
  let adminsession = req.session.admin
  let product = await productHelpers.getProductDetails(req.params.id)
  console.log(product);
  res.render('admin/edit-product', { product, adminsession })
})



router.post('/edit-product/:id', verifyAdminLogin, (req, res) => {
  console.log(req.params.id);
  productHelpers.updateProduct(req.params.id, req.body).then(() => {
    try {
      if (req.files.image1) {
        let image1 = req.files.image1
        image1.mv("./public/product-image/" + id + "1.jpg");
      } if (req.files.image2) {
        let image2 = req.files.image2
        image2.mv("./public/product-image/" + id + "2.jpg");
      } if (req.files.image3) {
        let image3 = req.files.image3
        image3.mv("./public/product-image/" + id + "3.jpg");
      } if (req.files.image4) {
        let image4 = req.files.image4
        image4.mv("./public/product-image/" + id + "4.jpg");
      }
      res.redirect('/admin/view-product')
    } catch {
      res.redirect('/admin/view-product')
    }

  })
})


//category 


router.get('/view-category', verifyAdminLogin, (req, res) => {
  let adminsession = req.session.admin
  adminHelpers.getAllCategory().then((response) => {
    let categories = response
    res.render('admin/view-category', { categories, adminsession, categoryproductexists: req.session.categoryproductexists })
    req.session.categoryproductexists = false
  })
})




router.get('/add-category', verifyAdminLogin, (req, res) => {
  let adminsession = req.session.admin
  catAddErr = req.session.categoryError

  res.render('admin/add-category', { adminsession, catAddErr })
})



router.post('/add-category', verifyAdminLogin, (req, res) => {
  adminHelpers.addCategory(req.body).then((response) => {
    res.redirect('/admin/view-category')
  }).catch(() => {
    req.session.categoryError = "category already exists"
    console.log(req.session.categoryError);
    res.redirect("/admin/add-category")
  })
})



router.get('/delete-category/:id/:category', verifyAdminLogin, (req, res) => {

  let categoryId = req.params.id
  adminHelpers.deleteCategory(categoryId, req.params.category).then(() => {
    res.redirect('/admin/view-category')
  }).catch(() => {
    req.session.categoryproductexists = true
    res.redirect('/admin/view-category')

  })

})

router.get('/edit-category/:id', verifyAdminLogin, async (req, res) => {
  let adminsession = req.session.admin
  let category = await adminHelpers.getCategoryDetails(req.params.id)
  console.log(category);
  res.render('admin/edit-category', { category, adminsession })
})


router.post('/edit-category/:id', verifyAdminLogin, (req, res) => {
  console.log(req.params.id);
  id = req.params.id
  adminHelpers.updateCategory(req.params.id, req.body).then(() => {
    res.redirect('/admin/view-category')
  })
})


router.get('/block-user/:id', verifyAdminLogin, (req, res) => {
  let adminsession = req.session.admin
  let userID = req.params.id
  adminHelpers.blockUser(userID).then((response) => {
    res.redirect('/admin/view-user')
  })
})

router.get('/unblock-user/:id', verifyAdminLogin, (req, res) => {
  let userID = req.params.id
  adminHelpers.unblockUser(userID).then((response) => {
    res.redirect('/admin/view-user')
  })
})

router.get('/order-management', verifyAdminLogin, async (req, res) => {
  let adminsession = req.session.admin
  let allOrderDetails = await adminHelpers.getAllUserNames()
  res.render('admin/allorders', { adminsession, allOrderDetails })
})


router.post('/order-status', verifyAdminLogin, (req, res) => {
  console.log(req.body);

  adminHelpers.changeOrderStatus(req.body.orderId, req.body.status).then((response) => {
    res.redirect('/admin/order-management')
  })
})

router.get('/banner-management', verifyAdminLogin, (req, res) => {
  let adminsession = req.session.admin
  bannerHelpers.getAllBanners().then((response) => {
    let allbanners = response
    res.render('admin/view-banners', { allbanners, adminsession })
  })
})

router.get('/add-banners', verifyAdminLogin, (req, res) => {
  let adminsession = req.session.admin
  bannerExistError = req.session.bannerExistError
  res.render('admin/add-banners', { adminsession, bannerExistError })
  bannerExistError = null
})

router.post('/add-banners', verifyAdminLogin, (req, res) => {
  console.log(req.body);
  bannerHelpers.addBanner(req.body).then((response) => {
    let id = response.insertedId
    let image = req.files.image
    image.mv("./public/banner-image/" + id + ".jpg");
    res.redirect('/admin/banner-management')
  }).catch(() => {
    req.session.bannerExistError = "banner Already exist"
    console.log(req.session.bannerExistError);
    res.redirect("/admin/add-banners")
  })
})

router.get('/delete-banner/:id', verifyAdminLogin, (req, res) => {
  let bannerId = req.params.id                                //deletting user data
  bannerHelpers.deleteBanner(bannerId).then((response) => {
    res.redirect('/admin/banner-management')
  })

})

router.get('/view-order-products/:id', verifyAdminLogin, async (req, res) => {
  let adminsession = req.session.admin
  let products = await adminHelpers.getOrderProductsAdmin(req.params.id)
  res.render('admin/view-ordered-products', { products, adminsession })
})



router.get('/chart-data', verifyAdminLogin, (req, res) => {
  dashboardHelpers.getchartData().then((obj) => {
    let result = obj.result
    let weeklyReport = obj.weeklyReport
    console.log(result, "resultttttttt");
    console.log(weeklyReport, "weeekkkklyyyy");
    res.json({ data: result, weeklyReport })
  })
})




//product offer management
router.get('/product-offers', verifyAdminLogin, async (req, res) => {
  let adminsession = req.session.admin
  let allProducts = await productHelpers.getAllProduct()
  let prodOffers = await offerHelpers.getAllProductOffers()
  res.render('admin/product-offers', { admin: true, adminsession, allProducts, prodOffers })
})




router.post('/product-offers', verifyAdminLogin, async (req, res) => {
  offerHelpers.addProductOffer(req.body).then(() => {
    res.redirect('/admin/product-offers')
  })
})



//edit prod offer
router.get('/edit-product-offer/:_id', verifyAdminLogin, async (req, res) => {
  let adminsession = req.session.admin
  let proOfferId = req.params._id
  let proOfferDetails = await offerHelpers.getProdOfferDetails(proOfferId)
  res.render('admin/edit-product-offer', { admin: true, adminsession, proOfferDetails })
})




router.post('/edit-product-offer/:_id', verifyAdminLogin, (req, res) => {
  let proOfferId = req.params._id
  offerHelpers.editProdOffer(proOfferId, req.body).then(() => {
    res.redirect('/admin/product-offers')
  })
})


//delete prod offer
router.get('/delete-prodOffer/:_id', verifyAdminLogin, (req, res) => {
  let proOfferId = req.params._id
  offerHelpers.deleteProdOffer(proOfferId).then(() => {
    res.redirect('/admin/product-offers')
  })
})





//category offer management
router.get('/category-offers', verifyAdminLogin, async (req, res) => {
  let adminsession = req.session.admin
  let allCategories = await offerHelpers.getAllCategories()
  console.log(allCategories);
  let CatOffers = await offerHelpers.getAllCatOffers()
  res.render('admin/category-offers', { admin: true, adminsession, allCategories, CatOffers, catOfferExistError: req.session.catOfferExistError })
  req.session.catOfferExistError = false
})




router.post('/category-offers', verifyAdminLogin, (req, res) => {
  offerHelpers.addCatOffer(req.body).then(() => {
    res.redirect('/admin/category-offers')
  }).catch(() => {
    req.session.catOfferExistError = true
    res.redirect('/admin/category-offers')
  })
})




//edit category offer
router.get('/edit-catOffer/:_id', verifyAdminLogin, async (req, res) => {
  let adminsession = req.session.admin
  let catOfferId = req.params._id
  let catOfferDetails = await offerHelpers.getCatOfferDetails(catOfferId)
  res.render('admin/edit-catOffer', { admin: true, adminsession, catOfferDetails })
})



router.post('/edit-catOffer/:_id', verifyAdminLogin, (req, res) => {
  let catOfferId = req.params._id
  offerHelpers.editCatOffer(catOfferId, req.body).then(() => {
    res.redirect('/admin/category-offers')
  })
})



//delete category offer
router.get('/delete-catOffer/:id', verifyAdminLogin, async (req, res) => {
  await offerHelpers.deleteCatOffer(req.params.id).then(() => {
    res.redirect('/admin/category-offers')
  })
})




//coupon management
router.get('/coupon-management', verifyAdminLogin, async (req, res) => {
  let adminsession = req.session.admin
  let allCoupons = await couponHelpers.getAllCoupons()
  res.render('admin/coupon-management', { admin: true, adminsession, couponExist: req.session.couponExist, allCoupons })
  req.session.couponExist = false;
})




//add coupon
router.post('/add-coupon', verifyAdminLogin, (req, res) => {
  // console.log(req.body.coupon);
  couponHelpers.addCoupon(req.body).then(() => {
    res.redirect('/admin/coupon-management')
  }).catch(() => {
    req.session.couponExist = "coupon already exists !!!"
    res.redirect('/admin/coupon-management')
  })

})



//edit coupon
router.get('/edit-coupon/:_id', verifyAdminLogin, async (req, res) => {
  let adminsession = req.session.admin
  let couponId = req.params._id
  let couponDetails = await couponHelpers.getCouponDetails(couponId)
  res.render('admin/edit-coupon', { admin: true, adminsession, couponDetails })
})
router.post('/edit-coupon/:_id', verifyAdminLogin, (req, res) => {
  let couponId = req.params._id
  let data = req.body
  couponHelpers.editCoupon(data, couponId).then(() => {
    console.log('edited succesfully');
    res.redirect('/admin/coupon-management')
  })
})




//delete coupon
router.get('/delete-coupon/:_id', verifyAdminLogin, (req, res) => {
  let couponId = req.params._id
  couponHelpers.deleteCoupon(couponId).then(() => {
    res.redirect('/admin/coupon-management')
  })
})




router.get('/inventory', verifyAdminLogin, async (req, res) => {
  let adminsession = req.session.admin
  let stock = await productHelpers.getStocks()
  res.render('admin/stock', { admin: true, adminsession, stock })
})

router.get('/sales-report', verifyAdminLogin, async (req, res) => {
  let adminsession = req.session.admin
  await adminHelpers.getAllUserNames().then((response) => {
    let salesReport = response
    res.render('admin/sales-report', { admin: true, adminsession, salesReport })
  })
})
module.exports = router;
