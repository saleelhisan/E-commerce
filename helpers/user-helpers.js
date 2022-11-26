var db = require('../config/connection')
var collection = require('../config/collection')
const bcrypt = require('bcrypt')
const { response } = require('express')
const { DefaultsList } = require('twilio/lib/rest/autopilot/v1/assistant/defaults')
var objectId = require('mongodb').ObjectId
const Razorpay = require('razorpay');
const { resolve } = require('path')
var paypal = require('paypal-rest-sdk');
const moment = require('moment')
const referralCodeGenerator = require('referral-code-generator')

paypal.configure({
    'mode': 'sandbox', //sandbox or live
    'client_id': process.env.client_id,
    'client_secret': process.env.client_secret
});


var instance = new Razorpay({
    key_id: process.env.key_id,
    key_secret: process.env.key_secret,
});



module.exports = {
    getOrderDetails: (orderId) => {
        return new Promise(async (resolve, reject) => {
            let orderDetails = await db.get().collection(collection.ORDER_COLLECTION).find({ _id: objectId(orderId) }).toArray();
            var i;
            for (i = 0; i < orderDetails.length; i++) {
                orderDetails[i].date = moment(orderDetails[i].date).format("LLLL");
            }
            resolve(orderDetails[0]);
        });
    },



    doSignup: (userData) => {
        return new Promise(async (resolve, reject) => {
            let response = {}
            let user = await db.get().collection(collection.USER_COLLECTION).findOne({ email: userData.email })
            let user1 = await db.get().collection(collection.USER_COLLECTION).findOne({ mobile: userData.mobile })
            if (user || user1) {
                resolve(response.status = false)
            }
            else {
                let referral = userData.referral;
                if (referral) {
                    let referUser = await db
                        .get()
                        .collection(collection.USER_COLLECTION)
                        .findOne({ referralCode: referral });
                    if (referUser) {
                        userData.password = await bcrypt.hash(userData.password, 10);
                        let referralCode =
                            userData.name.slice(0, 3) +
                            referralCodeGenerator.alpha("uppercase", 6);
                        userData.referralCode = referralCode;
                        userData.wallet = 50;
                        db.get()
                            .collection(collection.USER_COLLECTION)
                            .insertOne(userData)
                            .then((userdata) => {
                                if (referUser.wallet) {
                                    walletAmount = parseInt(referUser.wallet);
                                    db.get()
                                        .collection(collection.USER_COLLECTION)
                                        .updateOne(
                                            { _id: objectId(referUser._id) },
                                            {
                                                $set: {
                                                    wallet: parseInt(100) + walletAmount,
                                                },
                                            }
                                        )
                                        .then(() => {
                                            resolve({ referandearn: true });
                                        });
                                } else {
                                    db.get()
                                        .collection(collection.USER_COLLECTION)
                                        .updateOne(
                                            { _id: objectId(referUser._id) },
                                            {
                                                $set: {
                                                    wallet: parseInt(100),
                                                },
                                            }
                                        )
                                        .then(() => {
                                            resolve({ status: true });
                                        });
                                }
                            });
                    } else {
                        reject();
                    }
                } else {
                    userData.password = await bcrypt.hash(userData.password, 10);
                    let username = userData.name.slice(0, 3)
                    username = username.toUpperCase()
                    let referralCode = username + referralCodeGenerator.alpha('uppercase', 6)
                    console.log(referralCode);
                    userData.referralCode = referralCode;
                    db.get()
                        .collection(collection.USER_COLLECTION)
                        .insertOne(userData)
                        .then((response) => {
                            resolve({ status: true });
                        });
                }

            }

        })
    },


    //inserting data to the database  
    doLogin: (userData) => {
        let response = {}
        return new Promise(async (resolve, reject) => {
            let user = await db.get().collection('user').findOne({ email: userData.email })
            if (user) {
                if (user.isBlocked) {
                    response.isBlocked = true
                    resolve(response)
                } else {
                    bcrypt.compare(userData.password, user.password).then((status) => {
                        if (status) {
                            console.log('user login success');
                            response.user = user
                            response.status = true
                            resolve(response)
                        } else {
                            console.log('invalid password');
                            resolve({ status: false })
                        }
                    })
                }
            }
            else {
                console.log('user not found');
                resolve({ status: false })
            }
        })


    },



    isBlockedUser: (emailId) => {
        return new Promise(async (resolve, reject) => {
            await db.get().collection('user').findOne({ email: emailId }).then((response) => {
                resolve(response)
            })
        })
    },



    checkMobile: (data) => {
        return new Promise(async (resolve, reject) => {
            await db.get().collection('user').findOne({ mobile: data }).then((response) => {
                resolve(response)
            })
        })
    },



    addToCart: (proId, userID) => {
        let proObj = {
            item: objectId(proId),
            quantity: 1
        }
        return new Promise(async (resolve, reject) => {
            let userCart = await db.get().collection('cart').findOne({ user: objectId(userID) })
            if (userCart) {
                let proExist = userCart.products.findIndex(product => product.item == proId)
                if (proExist != -1) {
                    db.get().collection('cart').updateOne({ user: objectId(userID), 'products.item': objectId(proId) }, {
                        $inc: { 'products.$.quantity': 1 }
                    }).then(() => {
                        resolve()
                    })
                }
                else {
                    db.get().collection('cart').updateOne({ user: objectId(userID) }, {
                        $push: { products: proObj }
                    }).then((response) => {
                        resolve(response)
                    })
                }
            } else {
                let cartObj = {
                    user: objectId(userID),
                    products: [proObj]
                }
                db.get().collection('cart').insertOne(cartObj).then((response) => {
                    resolve(response)

                })
            }
        })

    },



    getCartProducts: (userID) => {
        return new Promise(async (resolve, reject) => {
            let cartItems = await db.get().collection('cart').aggregate([
                {
                    $match: { user: objectId(userID) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: 'product',
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                    }
                }

            ]).toArray()
            resolve(cartItems)
        })
    },



    getCartCount: (userID) => {
        return new Promise(async (resolve, reject) => {
            let count = 0
            let cart = await db.get().collection('cart').findOne({ user: objectId(userID) })
            if (cart) {
                count = cart.products.length
            }
            resolve(count)
        })
    },



    getWishlistCount: (userID) => {
        return new Promise(async (resolve, reject) => {
            let count = 0
            let wishlist = await db.get().collection('wishlist').findOne({ user: objectId(userID) })
            if (wishlist) {
                count = wishlist.products.length
            }
            resolve(count)
        })
    },
    // changeProductQuantity: (details) => {
    //     details.count = parseInt(details.count)
    //     details.quantity = parseInt(details.quantity)
    //     return new Promise(async (resolve, reject) => {
    //         if (details.count == -1 && details.quantity == 1) {
    //             db.get().collection('cart').updateOne({ _id: objectId(details.cart) },
    //                 {
    //                     $pull: { products: { item: objectId(details.product) } }
    //                 }).then((response) => {
    //                     resolve({ removeProduct: true })
    //                 })
    //         } else {
    //             db.get().collection('cart').updateOne({ _id: objectId(details.cart), 'products.item': objectId(details.product) },
    //                 {
    //                     $inc: { 'products.$.quantity': details.count }
    //                 }).then((response) => {
    //                     resolve({ status: true })
    //                 })
    //         }
    //     })
    // },
    changeProductQuantity: (details) => {
        details.count = parseInt(details.count)
        details.quantity = parseInt(details.quantity)
        return new Promise(async (resolve, reject) => {
            let stockCount = await db.get().collection(collection.PRODUCT_COLLECTION).findOne({ _id: objectId(details.product) })
            if (details.quantity == stockCount.stock && details.count == 1) {
                reject()
            } else {
                if (details.count == -1 && details.quantity == 1) {
                    db.get().collection(collection.CART_COLLECTION).updateOne({ _id: objectId(details.cart) },
                        {
                            $pull: { products: { item: objectId(details.product) } }
                        }
                    ).then((response) => {

                        resolve({ removeProduct: true })
                    })
                } else {
                    db.get().collection(collection.CART_COLLECTION).updateOne({ _id: objectId(details.cart), 'products.item': objectId(details.product) },
                        {
                            $inc: { 'products.$.quantity': details.count }
                        }
                    ).then((response) => {
                        resolve({ status: true })
                    })
                }
            }
        })
    },



    deleteCartItem: (cartId, proId) => {
        return new Promise((resolve, reject) => {
            db.get().collection('cart').updateOne({ _id: objectId(cartId), 'products.item': objectId(proId) }, {
                $pull: { products: { item: objectId(proId) } }
            }).then((response) => {
                console.log(response);
                resolve()
            })
        })

    },



    getTotalAmount: (userId) => {

        return new Promise(async (resolve, reject) => {
            let total = await db.get().collection('cart').aggregate([
                {
                    $match: { user: objectId(userId) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: 'product',
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: { $multiply: ['$quantity', '$product.price'] } }
                    }
                }

            ]).toArray()

            if (total.length > 0) {
                resolve(total[0].total)
            } else {
                resolve(0)
            }
        })
    },



    placeOrder: (order, products, total) => {
        return new Promise((resolve, reject) => {
            if (order.coupon) {
                db.get()
                    .collection(collection.COUPON_COLLECTION)
                    .updateOne(
                        { coupon: order.coupon },
                        {
                            $push: {
                                users: order.userId,
                            },
                        }
                    );
            }
            let status = order.paymentMethod === 'COD' || 'paypal' || 'wallet' ? 'placed' : 'pending'
            let orderObj = {
                deliveryDetails: {
                    name: order.name,
                    mobile: order.phone,
                    address: order.address,
                    town: order.town,
                    state: order.state,
                    pincode: order.pincode,
                },
                userId: objectId(order.userId),
                paymentMethod: order.paymentMethod,
                products: products,
                totalAmount: total,
                status: status,
                date: new Date()
            }
            db.get().collection('order').insertOne(orderObj).then((response) => {
                products.forEach(async (element) => {
                    console.log(element, "products");
                    let product = await db
                        .get()
                        .collection(collection.PRODUCT_COLLECTION)
                        .findOne({ _id: element.item });
                    let pquantity = Number(product.stock);
                    pquantity = pquantity - element.quantity;
                    await db
                        .get()
                        .collection(collection.PRODUCT_COLLECTION)
                        .updateOne(
                            { _id: element.item },
                            {
                                $set: {
                                    stock: pquantity,
                                },
                            }
                        );
                });


                db.get().collection('cart').deleteOne({ user: objectId(order.userId) })
                resolve(response.insertedId)
            })
        })

    },



    getCartProductList: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cart = await db.get().collection('cart').findOne({ user: objectId(userId) })
            if (cart) {
                resolve(cart.products)
            }
            resolve(0)
        })
    },



    getUserOrders: (userId) => {
        return new Promise(async (resolve, reject) => {
            let orders = await db.get().collection('order').find({ userId: objectId(userId) }).sort({ date: -1 }).toArray();
            let i;
            for (i = 0; i < orders.length; i++) {
                orders[i].date = moment(orders[i].date).format('lll');
            }
            resolve(orders)
        })
    },



    getOrderProducts: (orderId) => {
        return new Promise(async (resolve, reject) => {
            let orderItems = await db.get().collection('order').aggregate([
                {
                    $match: { _id: objectId(orderId) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: 'product',
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                    }
                }

            ]).toArray()
            resolve(orderItems)
        })
    },



    cancelOrder: (id) => {
        return new Promise(async (resolve, reject) => {
            await db.get().collection('order').updateOne({ _id: objectId(id) }, { $set: { status: "cancelled", isCancelled: true } })
            resolve()
        })
    },




    sortproducts: (sortby) => {
        return new Promise(async (resolve, reject) => {
            let sortedProductsasc = await db.get().collection('product').find().sort({ price: sortby }).toArray()
            resolve(sortedProductsasc)
        })
    },



    filterFunction: (data) => {
        filterType = data
        return new Promise(async (resolve, reject) => {
            let fictionFiltered = await db.get().collection('product').find({ category: filterType }).toArray()
            resolve(fictionFiltered)
        })
    },



    addAddress: (data, userId) => {
        return new Promise((resolve, reject) => {
            db.get().collection('user').updateOne({ _id: objectId(userId) }, {
                $addToSet: { address: data }
            })
            resolve()
        })
    },



    deleteAddress: (addressId, userId) => {
        return new Promise((resolve, reject) => {
            db.get().collection('user').updateOne({ _id: objectId(userId), 'address.id': addressId }, {
                $pull: { address: { id: addressId } }
            })
            resolve(true)
        })
    },



    getAddress: (userId) => {
        return new Promise((resolve, reject) => {
            db.get().collection('user').findOne({ _id: objectId(userId) }, {
                $projection: {
                    address: 1
                }
            }).then((response) => {
                resolve(response)
            })
        })
    },



    getUserDetails: (userId) => {
        return new Promise(async (resolve, reject) => {
            await db.get().collection('user').findOne({ _id: objectId(userId) }).then((response) => {
                resolve(response)
            })
        })
    },



    generateRazorpay: (orderId, totalPrice) => {
        return new Promise((resolve, reject) => {
            var options = {
                amount: totalPrice * 100,
                currency: "INR",
                receipt: "" + orderId
            };
            instance.orders.create(options, function (err, order) {
                if (err) {
                    console.log(err);
                    console.log('error occured in generate razorpay');
                } else {
                    resolve(order)
                }
            });
        })
    },



    generatePayal: (orderId, totalPrice) => {
        console.log('helperil-----------------------');
        return new Promise((resolve, reject) => {
            var create_payment_json = {
                "intent": "sale",
                "payer": {
                    "payment_method": "paypal"
                },
                "redirect_urls": {
                    "return_url": "http://localhost:3000/order-placed",
                    "cancel_url": "http://localhost:3000/place-order"
                },
                "transactions": [{
                    "item_list": {
                        "items": [{
                            "name": "item",
                            "sku": "item",
                            "price": totalPrice,
                            "currency": "USD",
                            "quantity": 1
                        }]
                    },
                    "amount": {
                        "currency": "USD",
                        "total": totalPrice
                    },
                    "description": "This is the payment description."
                }]
            };
            paypal.payment.create(create_payment_json, function (error, payment) {
                console.log('create cheyyunnu-------------------');
                if (error) {
                    console.log(error);
                    throw error;

                } else {
                    console.log("Create Payment Response");
                    console.log(payment.links[1].href);
                    resolve(payment.links[1].href);
                }
            });

        })
    },



    verifyPayment: (paymentDetails) => {
        return new Promise((resolve, reject) => {
            //Loading the crypto module in node.js
            const crypto = require('crypto');
            let hmac = crypto.createHmac('sha256', 'XJPqvXBwVVA7D2e93yYS9P7y')
            hmac.update(paymentDetails['payment[razorpay_order_id]'] + '|' + paymentDetails['payment[razorpay_payment_id]'])
            hmac = hmac.digest('hex')
            if (hmac == paymentDetails['payment[razorpay_signature]']) {
                resolve()
            } else {
                reject()
            }
        })
    },



    changePaymentStatus: (orderId) => {
        console.log(orderId);
        return new Promise((resolve, reject) => {
            db.get().collection('order').updateOne({ _id: objectId(orderId) },
                {
                    $set: {
                        status: 'placed'
                    }
                })
            resolve()
        })
    },



    passwordChanger: (userMail, oldPassword, newPassword) => {
        return new Promise(async (resolve, reject) => {
            newPassword = await bcrypt.hash(newPassword, 10)
            let user = await db.get().collection('user').findOne({ email: userMail })
            if (user) {
                bcrypt.compare(oldPassword, user.password).then((status) => {
                    if (status) {
                        db.get().collection('user').updateOne({ email: userMail },
                            { $set: { password: newPassword } }).then(() => {
                                resolve()
                            })
                    } else {
                        reject()
                    }
                })
            }
        })
    },



    editProfile: (userData, currentUser) => {

        return new Promise(async (resolve, reject) => {



            // let exists =  await db.get().collection(collection.USER_COLLECTION).findOne({$or:[{email:userData.email},{mobile:userData.mobile}]})
            let exists = false
            if (exists) {
                reject()
            }
            else {
                db.get().collection('user').updateOne({ _id: objectId(userData._id) },
                    {
                        $set: { name: userData.name, email: userData.email, mobile: userData.mobile }
                    }).then(() => {
                        resolve()
                    })
            }
        })

    },



    changeSubtotals: (details) => {
        details.count = parseInt(details.count)
        details.quantity = parseInt(details.quantity)
        return new Promise(async (resolve, reject) => {

        })
    },



    getCartSubTotal: (userId, proId) => {
        return new Promise(async (resolve, reject) => {
            let cartSubTotal = await db.get().collection('cart').aggregate([
                {
                    $match: { user: objectId(userId) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: 'product',
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $match: {
                        item: objectId(proId)
                    }
                },
                {
                    $project: {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                    }
                },
                {
                    $project: {
                        unitprice: { $toInt: '$product.price' },
                        quantity: { $toInt: '$quantity' }
                    }
                },
                {
                    $project: {
                        _id: null,
                        subtotal: { $sum: { $multiply: ['$quantity', '$unitprice'] } }
                    }
                }
            ]).toArray()
            // console.log(cartSubTotal)
            if (cartSubTotal.length > 0) {
                db.get().collection('cart').updateOne({ user: objectId(userId), "products.item": objectId(proId) },
                    {
                        $set: {
                            'products.$.subtotal': cartSubTotal[0].subtotal
                        }
                    }).then((response) => {
                        resolve(cartSubTotal[0].subtotal)
                    })
            }
            else {
                cartSubTotal = 0
                resolve(cartSubTotal)
            }
        })
    },



    changeForgotPassword: (password, userId) => {
        return new Promise(async (resolve, reject) => {
            password = await bcrypt.hash(password, 10)
            await db.get().collection('user').updateOne({ _id: objectId(userId) },
                {
                    $set: { password: password }
                }).then((response) => {
                    resolve()
                })
        })
    },



    findWallet: (orderId) => {
        return new Promise((resolve, reject) => {
            db.get().collection('user').findOne({ _id: objectId(orderId) }).then((response) => {
                resolve(response)
            })
        })
    },



    getOrder: (orderId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ORDER_COLLECTION).findOne({ _id: objectId(orderId) }).then((response) => {
                resolve(response)
            })
        })
    },



    findWalletAmount: (userId) => {
        return new Promise(async (resolve, reject) => {
            await db.get().collection(collection.USER_COLLECTION).findOne({ _id: objectId(userId) }).then((response) => {
                resolve(response)
            })
        })
    },



    findRefundAmount: (orderId) => {
        return new Promise(async (resolve, reject) => {
            await db.get().collection(collection.ORDER_COLLECTION).findOne({ _id: objectId(orderId) }, { totalAmount: 1 }).then((response) => {
                resolve(response.totalAmount)
            })
        })
    },



    toWallet: (userId, orderId, amount) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.USER_COLLECTION).updateOne({ _id: objectId(userId) }, { $set: { wallet: parseInt(amount) } }).then(() => {
                db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: objectId(orderId) }, { $set: { status: 'Refund initiated' } }).then(() => {
                    resolve()
                })
            })
        })
    },



    setWallet: (amount, orderId, userid) => {
        return new Promise((resolve, reject) => {
            db.get()
                .collection(collection.USER_COLLECTION)
                .updateOne(
                    { _id: objectId(userid) },
                    {
                        $set: {
                            wallet: parseInt(amount)
                        },
                    }
                )
                .then(() => {
                    db.get()
                        .collection(collection.ORDER_COLLECTION)
                        .updateOne(
                            { _id: objectId(orderId) },
                            {
                                $set: {
                                    status: "Refund has been initiated",
                                },
                            }
                        )
                        .then(() => {
                            resolve()
                        });
                });
        })
    },



    returnOrder: (orderId) => {
        return new Promise(async (resolve, reject) => {
            await db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: objectId(orderId) }, { $set: { status: "returned", isReturned: true } })
            resolve()
        })
    },



    reduceWallet: (user, amount, walletamount) => {

        let userId = user._id
        // let walletamount = user.wallet
        return new Promise((resolve, reject) => {
            db.get().collection(collection.USER_COLLECTION).updateOne({ _id: objectId(userId) }, { $set: { wallet: walletamount - amount } })
            resolve()
        })
    },



    // invoice
    getUserInvoice: (orderId) => {
        return new Promise(async (resolve, reject) => {
            console.log(orderId);
            let orders = await db.get().collection(collection.ORDER_COLLECTION).find({ _id: objectId(orderId) }, { sort: { date: -1 } }).toArray()
            let i;
            for (i = 0; i < orders.length; i++) {
                orders[i].date = moment(orders[i].date).format('lll');
            }
            var k;
            for (k = 0; k < orders.length; k++) {
                orders[k].deliverdDate = moment(orders[k].deliverdDate).format('lll');
            }
            resolve(orders)
        })
    },



    // status track
    statusTrack: (orderId) => {
        return new Promise(async (resolve, reject) => {
            let track = await db.get().collection(collection.ORDER_COLLECTION).findOne({ _id: objectId(orderId) })
            track.date = moment(track.date).format('lll');
            track.shippedDate = moment(track.shippedDate).format('lll');
            track.cancellDate = moment(track.cancellDate).format('lll');
            track.OutForDeliveryDate = moment(track.OutForDeliveryDate).format('lll');
            track.deliverdDate = moment(track.deliverdDate).format('lll');


            resolve(track)
        })
    },

    // editAddress: (data, userId) => {
    //     let uniqueid = data.uniqueid
    //     console.log(uniqueid);
    //     return new Promise(async (resolve, reject) => {
    //         let user = await db.get().collection(collection.USER_COLLECTION).findOne({ _id: objectId(userId)})
    //         console.log(user);
    //         console.log('-----------------------------------------------------------------------');
    //         let index = user.address.findIndex(address => address.uniqueid == uniqueid)
    //         db.get().collection(collection.USER_COLLECTION).updateOne({ _id: objectId(userId), 'address.uniqueid': uniqueid }, {
    //             $set: {
    //                 'address.$': data
    //             }
    //         }).then(() => {
    //             resolve()
    //         })

    //     })
    // }

    editAddress: (data, userId) => {
        if (data.id != '' && data.name != '' && data.address != '' && data.town != '' && data.district != '' && data.state != '' && data.pincode != '' && data.phone != '') {
            let uniqueid = data.id
            return new Promise(async (resolve, reject) => {
                let user = await db.get().collection(collection.USER_COLLECTION).findOne({ _id: objectId(userId) })
                let index = user.address.findIndex(address => address.uniqueid == uniqueid)
                db.get().collection(collection.USER_COLLECTION).updateOne({ _id: objectId(userId), 'address.id': uniqueid }, {
                    $set: {
                        'address.$': data
                    }
                }).then(() => {
                    resolve()
                })
            })
        } else {
            reject()
        }
    },



    findProCount: (userId, proId) => {
        return new Promise(async (resolve, reject) => {
            try {
                let count = await db.get().collection(collection.CART_COLLECTION).aggregate([
                    {
                        $match: {
                            user: objectId(userId)
                        }
                    },
                    {
                        $project: {
                            _id: 0,
                            products: '$products'
                        }
                    },
                    {
                        $unwind: '$products'
                    },
                    {
                        $match: {
                            'products.item': objectId(proId)
                        }
                    },
                    {

                        $project: {
                            quantity: '$products.quantity'
                        }
                    }
                ]).toArray()
                resolve(count[0].quantity)
            } catch {
                resolve(0)
            }
        })
    },



    findStock: (proId) => {
        return new Promise(async (resolve, reject) => {
            let count = await db.get().collection(collection.PRODUCT_COLLECTION).findOne({ _id: objectId(proId) })

            resolve(count.stock)
        })
    }





}