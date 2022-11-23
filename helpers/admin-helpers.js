var db = require('../config/connection')
var collection = require('../config/collection')
const bcrypt = require('bcrypt')
const { response } = require('express')
const { log } = require('handlebars')
const { ObjectID } = require('bson')
var objectId = require('mongodb').ObjectId
const moment = require('moment')


module.exports = {                                                                 //inserting data to the database  
    getAllUser: () => {
        return new Promise(async (resolve, reject) => {
            let users = await db.get().collection(collection.USER_COLLECTION).find().toArray()   //function for getting user details
            resolve(users)
        })
    },
    addUser: (user) => {
        let response = {}
        return new Promise(async (resolve, reject) => {
            let userData = await db.get().collection(collection.USER_COLLECTION).findOne({ email: user.email })
            if (userData) {
                resolve(response.status = false)
            } else {
                user.password = await bcrypt.hash(user.password, 10)
                db.get().collection(collection.USER_COLLECTION).insertOne(user).then((req, res) => {
                    resolve(response.status = true)
                })
            }
        })
    },
    deleteUser: (emailId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.USER_COLLECTION).deleteOne({ email: emailId }).then((response) => {              //admin deleting user 
                console.log('User deleted');
                resolve(response)
            })
        })
    },
    getUserDetails: (emailId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.USER_COLLECTION).findOne({ email: emailId }).then((user) => {
                resolve(user)
            })
        })
    },
    editUser: (emailId, userDetails) => {
        return new Promise(async (resolve, reject) => {
            password = await bcrypt.hash(userDetails.password, 10)
            db.get().collection(collection.USER_COLLECTION).updateOne({ email: emailId }, {
                $set: {
                    name: userDetails.name,
                    email: userDetails.email,
                    password: password
                }
            }).then((response) => {
                resolve()
            })
        })
    },
    addAdmin: (data) => {
        let response = {}
        return new Promise(async (resolve, reject) => {
            let admindata = await db.get().collection(collection.ADMIN_COLLECTION).findOne({ email: data.email })
            if (admindata) {
                console.log("admin already exists");
                resolve(response.status = false)
            } else {
                data.password = await bcrypt.hash(data.password, 10)
                db.get().collection(collection.ADMIN_COLLECTION).insertOne(data).then((req, res) => {
                    resolve(resolve.status = true)
                })
            }
        })
    },
    adminLogin: (data) => {
        return new Promise(async (resolve, reject) => {
            let loginstatus = false
            let response = {}
            let admin = await db.get().collection(collection.ADMIN_COLLECTION).findOne({ email: data.email })
            if (admin) {
                bcrypt.compare(data.password, admin.password).then((status) => {
                    if (status) {
                        console.log('Admin access success');
                        response.admin = admin
                        response.status = true
                        resolve(response)
                    } else {
                        console.log('access denied');
                        resolve({ status: false })
                    }
                })
            } else {
                console.log('no admin exists');
                resolve({ status: false })
            }
        })
    },
    addCategory: (data) => {
        return new Promise(async (resolve, reject) => {
            let category = await db.get().collection(collection.CATEGORY_COLLECTION).findOne({ name: data.name })
            if (category) {
                reject()
            } else {
                db.get().collection(collection.CATEGORY_COLLECTION).insertOne(data).then((response) => {
                    resolve(response)
                })
            }
        })
    },
    getAllCategory: () => {
        return new Promise(async (resolve, reject) => {
            await db.get().collection(collection.CATEGORY_COLLECTION).find().toArray().then((response) => {
                resolve(response)
            })
        })
    },
    deleteCategory: (categoryId,categoryname) => {
        console.log(categoryname);
        return new Promise(async(resolve, reject) => {
             let catexists = await db.get().collection('product').findOne({category:categoryname})
            if(catexists != null){
                reject()
            }else{
                db.get().collection(collection.CATEGORY_COLLECTION).deleteOne({ _id: objectId(categoryId) }).then((response) => {
                    resolve(response)
                })
            }
            
        })

    },
    getCategoryDetails: (categoryId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.CATEGORY_COLLECTION).findOne({ _id: objectId(categoryId) }).then((category) => {
                resolve(category)
            })
        })
    },
    updateCategory: (categoryId, categoryDetails) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.CATEGORY_COLLECTION).updateOne({ _id: objectId(categoryId) }, {
                $set: {
                    name: categoryDetails.name
                }
            }).then((response) => {
                resolve()
            })
        })
    },
    blockUser: (userID) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.USER_COLLECTION).updateOne({ _id: objectId(userID) }, { $set: { isBlocked: true } }).then((response) => {
                resolve(response)
            })
        })
    },
    unblockUser: (userID) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.USER_COLLECTION).updateOne({ _id: objectId(userID) }, { $set: { isBlocked: false } }).then((response) => {
                resolve(response)
            })
        })
    },
    getAllUserNames: () => {
        return new Promise(async (resolve, reject) => {
            let orders =  await db.get().collection(collection.ORDER_COLLECTION).find().sort({ date: -1 }).toArray()
                var i;
                for (i = 0; i < orders.length; i++) {
                    orders[i].date = moment(orders[i].date).format('lll');
                }
                resolve(orders)
        })
    },
    // order status change
    changeOrderStatus: (orderId,status) => {
    return new Promise((resolve, reject) => {
      if (status == "cancelled") {
        db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: objectId(orderId) }, {
          $set: {
            status: status,
            isCancelled: true,
            cancellDate: new Date()
          }
        }).then(() => {
          resolve()
        })
      } else if (status == "delivered") {
  
        db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: objectId(orderId) }, {
          $set: {
            status: status,
            isDelivered: true,
            deliverdDate: new Date()
  
          }
  
        }).then(() => {
          resolve()
        })
      } else if (status == "shipped") {
        db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: objectId(orderId) }, {
          $set: {
            status: status,
            isShipped: true,
            shippedDate: new Date()
  
          }
  
        }).then(() => {
          resolve()
        })
      } else if (status == "Out For Delivery") {
  
        db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: objectId(orderId) }, {
          $set: {
            status: status,
            isOutForDelivery: true,
            OutForDeliveryDate: new Date()
          }
  
        }).then(() => {
          resolve()
        })
      } else {
        db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: objectId(orderId) }, {
          $set: {
            status: status,
            isCancelled: false
          }
        }).then((response) => {
          console.log(response);
          resolve()
        })
  
      }
  
    })
  },
    getOrderProductsAdmin: (orderId) => {
        return new Promise(async (resolve, reject) => {
            let orderItems = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
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
    // monthly report
    monthlyReport: () => {
        return new Promise(async (resolve, reject) => {
            try{
            let start=new Date(new Date()-1000*60*60*24*30)
            let end = new Date()

            let orderSuccess = await db.get().collection(collection.ORDER_COLLECTION).find({ date: { $gte: start, $lte: end }, status: { $nin: ['cancelled'] } }).sort({ Date: -1, Time: -1 }).toArray()
            var i;
            for(i=0;i<orderSuccess.length;i++){
                orderSuccess[i].date=moment(orderSuccess[i].date).format('lll')
            }
            // console.log(orderSuccess,"hfgbkhdfbj");
            let orderTotal = await db.get().collection(collection.ORDER_COLLECTION).find({ date: { $gte: start, $lte: end } }).toArray()
            let orderSuccessLength = orderSuccess.length
            let orderTotalLength = orderTotal.length
            let orderFailLength = orderTotalLength - orderSuccessLength
            let total = 0
            let discount=0
            let razorpay = 0
            let cod = 0
            let paypal = 0
            let wallet=0
            
            for (let i = 0; i < orderSuccessLength; i++) {
                total = total + orderSuccess[i].totalAmount
                if (orderSuccess[i].paymentMethod === 'COD') {
                    cod++
                } else if (orderSuccess[i].paymentMethod === 'paypal') {
                    paypal++
                }else if (orderSuccess[i].paymentMethod === 'razorpay') {
                    razorpay++
                }
                 else {
                    wallet++
                }
                 if (orderSuccess[i].discount) {
                    console.log("discount check");
                    discount = discount + parseInt(orderSuccess[i].discount)
                    discount++
                }
            }

            let productCount=await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match:{
                       $and:[{status:{$nin:["cancelled"]}
                    },
                { date: { $gte: start, $lte: end }}]

                    },
                    
                },
                {
                    $project:{
                        _id:0,
                        quantity:'$products.quantity'
                        
                    }
                },
                {
                    $unwind:'$quantity'
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum:'$quantity' }
                    }
                }
              ]).toArray()

            var data = {
                start: moment(start).format('YYYY/MM/DD'),
                end: moment(end).format('YYYY/MM/DD'),
                totalOrders: orderTotalLength,
                successOrders: orderSuccessLength,
                failOrders: orderFailLength,
                totalSales: total,
                cod: cod,
                paypal: paypal,
                razorpay: razorpay,
                wallet:wallet,
                discount:discount,
                productCount:productCount[0].total,
               
                currentOrders: orderSuccess
            }
            // console.log(data,"heydata");
            resolve(data)
        }
        catch {
            resolve(0)
        }
      })
     },

    // get report
     getReport: (startDate,endDate) => {
        return new Promise(async (resolve, reject) => {
            try{
            let start=new Date(startDate)
            let end = new Date(endDate)
            
            let orderSuccess = await db.get().collection(collection.ORDER_COLLECTION).find({ date: { $gte: start, $lte: end }, status: { $nin: ['cancelled'] } }).sort({ Date: -1, Time: -1 }).toArray()
            //console.log(orderSuccess,"hfgbkhdfbj");
            let orderTotal = await db.get().collection(collection.ORDER_COLLECTION).find({ date: { $gte: start, $lte: end } }).toArray()
            let orderSuccessLength = orderSuccess.length
            let orderTotalLength = orderTotal.length
            let orderFailLength = orderTotalLength - orderSuccessLength
            let total = 0
            let discount=0

            let razorpay = 0
            let cod = 0
            let paypal = 0
            let wallet=0
            let productCount=0
            for (let i = 0; i < orderSuccessLength; i++) {
                total = total + orderSuccess[i].totalAmount
                if (orderSuccess[i].paymentMethod === 'COD') {
                    cod++
                } else if (orderSuccess[i].paymentMethod === 'paypal') {
                    paypal++
                }else if (orderSuccess[i].paymentMethod === 'razorpay') {
                    razorpay++
                }
                 else {
                    wallet++
                }
                 if (orderSuccess[i].discount) {
                
                    discount = discount + parseInt(orderSuccess[i].discount)
                    discount++
                }
            }

             productCount=await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match:{
                       $and:[{status:{$nin:["cancelled"]}
                    },
                { date: { $gte: start, $lte: end }}]

                    },
                    
                },
                {
                    $project:{
                        _id:0,
                        quantity:'$products.quantity'
                        
                    }
                },
                {
                    $unwind:'$quantity'
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum:'$quantity' }
                    }
                }
              ]).toArray()

            var data = {
                start: moment(start).format('YYYY/MM/DD'),
                end: moment(end).format('YYYY/MM/DD'),
                totalOrders: orderTotalLength,
                successOrders: orderSuccessLength,
                failOrders: orderFailLength,
                totalSales: total,
                cod: cod,
                paypal: paypal,
                razorpay: razorpay,
                wallet:wallet,
                discount:discount,
                productCount:productCount[0].total,
                currentOrders: orderSuccess
            }
            // console.log(data,"heydata");
            resolve(data)
        }catch {
            resolve(0)
        }
      })
     },

dailyReport:()=>{
    return new Promise(async(resolve, reject) => {
        try{

        let start=new Date(new Date()-1000*60*60*24)
        let end = new Date()

        let orderSuccess = await db.get().collection(collection.ORDER_COLLECTION).find({ date: { $gte: start, $lte: end }, status: { $nin: ['cancelled'] } }).sort({ Date: -1, Time: -1 }).toArray()
        
        let orderTotal = await db.get().collection(collection.ORDER_COLLECTION).find({ date: { $gte: start, $lte: end } }).toArray()
        let orderSuccessLength = orderSuccess.length
        let orderTotalLength = orderTotal.length
        let orderFailLength = orderTotalLength - orderSuccessLength
        let total = 0
        let discount=0
        let razorpay = 0
        let cod = 0
        let paypal = 0
        let wallet=0
        let productCount=0
        for (let i = 0; i < orderSuccessLength; i++) {
            total = total + orderSuccess[i].totalAmount
            if (orderSuccess[i].paymentMethod === 'COD') {
                cod++
            } else if (orderSuccess[i].paymentMethod === 'paypal') {
                paypal++
            }else if (orderSuccess[i].paymentMethod === 'razorpay') {
                razorpay++
            }
             else {
                wallet++
            }
             if (orderSuccess[i].discount) {
            
                discount = discount + parseInt(orderSuccess[i].discount)
                discount++
            }
        }
        productCount=await db.get().collection(collection.ORDER_COLLECTION).aggregate([
            {
                $match:{
                   $and:[{status:{$nin:["cancelled"]}
                },
            { date: { $gte: start, $lte: end }}]

                },
                
            },
            {
                $project:{
                    _id:0,
                    quantity:'$products.quantity'
                    
                }
            },
            {
                $unwind:'$quantity'
            },
            {
                $group: {
                    _id: null,
                    total: { $sum:'$quantity' }
                }
            }
          ]).toArray()
        var data = {
            start: moment(start).format('YYYY/MM/DD'),
            end: moment(end).format('YYYY/MM/DD'),
            totalOrders: orderTotalLength,
            successOrders: orderSuccessLength,
            failOrders: orderFailLength,
            totalSales: total,
            cod: cod,
            paypal: paypal,
            razorpay: razorpay,
            wallet:wallet,
            discount:discount,
            productCount:productCount[0].total,
            averageRevenue:total/productCount[0].total, 
            currentOrders: orderSuccess
        }
        resolve(data)
    }catch {
        resolve(0)
    }
    })
 },

// weekly report
 weeklyReport:()=>{
    return new Promise(async(resolve, reject) => {
        try{
        
        let start=new Date(new Date()-1000*60*60*24*7)

        let end = new Date()
        
        let orderSuccess = await db.get().collection(collection.ORDER_COLLECTION).find({ date: { $gte: start, $lte: end }, status: { $nin: ['cancelled'] } }).sort({ Date: -1, Time: -1 }).toArray()
        let orderTotal = await db.get().collection(collection.ORDER_COLLECTION).find({ date: { $gte: start, $lte: end } }).toArray()
        let orderSuccessLength = orderSuccess.length
        let orderTotalLength = orderTotal.length
        let orderFailLength = orderTotalLength - orderSuccessLength
        let total = 0
        let discount=0

        let razorpay = 0
        let cod = 0
        let paypal = 0
        let wallet=0
        let productCount=0
        for (let i = 0; i < orderSuccessLength; i++) {
            total = total + orderSuccess[i].totalAmount
            if (orderSuccess[i].paymentMethod === 'COD') {
                cod++
            } else if (orderSuccess[i].paymentMethod === 'paypal') {
                paypal++
            }else if (orderSuccess[i].paymentMethod === 'razorpay') {
                razorpay++
            }
             else {
                wallet++
            }
             if (orderSuccess[i].discount) {
            
                discount = discount + parseInt(orderSuccess[i].discount)
                discount++
            }
        }

        productCount=await db.get().collection(collection.ORDER_COLLECTION).aggregate([
            {
                $match:{
                   $and:[{status:{$nin:["cancelled"]}
                },
            { date: { $gte: start, $lte: end }}]

                },
                
            },
            {
                $project:{
                    _id:0,
                    quantity:'$products.quantity'
                    
                }
            },
            {
                $unwind:'$quantity'
            },
            {
                $group: {
                    _id: null,
                    total: { $sum:'$quantity' }
                }
            }
          ]).toArray()

        var data = {
            start: moment(start).format('YYYY/MM/DD'),
            end: moment(end).format('YYYY/MM/DD'),
            totalOrders: orderTotalLength,
            successOrders: orderSuccessLength,
            failOrders: orderFailLength,
            totalSales: total,
            cod: cod,
            paypal: paypal,
            razorpay: razorpay,
            wallet:wallet,
            discount:discount,
            productCount:productCount[0].total,
            averageRevenue:total/productCount[0].total,
            
            currentOrders: orderSuccess
        }

        resolve(data)
    }catch {
        resolve(0)
    }
    })
 },

 // yearly report
 yearlyReport:()=>{
    return new Promise(async(resolve, reject) => {
        try{
        
        let start=new Date(new Date()-1000*60*60*24*365)

        let end = new Date()
        
        let orderSuccess = await db.get().collection(collection.ORDER_COLLECTION).find({ date: { $gte: start, $lte: end }, status: { $nin: ['cancelled'] } }).sort({ Date: -1, Time: -1 }).toArray()
        let orderTotal = await db.get().collection(collection.ORDER_COLLECTION).find({ date: { $gte: start, $lte: end } }).toArray()
        let orderSuccessLength = orderSuccess.length
        let orderTotalLength = orderTotal.length
        let orderFailLength = orderTotalLength - orderSuccessLength
        let total = 0
        let discount=0

        let razorpay = 0
        let cod = 0
        let paypal = 0
        let wallet=0
        let productCount=0
        for (let i = 0; i < orderSuccessLength; i++) {
            total = total + orderSuccess[i].totalAmount
            if (orderSuccess[i].paymentMethod === 'COD') {
                cod++
            } else if (orderSuccess[i].paymentMethod === 'paypal') {
                paypal++
            }else if (orderSuccess[i].paymentMethod === 'razorpay') {
                razorpay++
            }
             else {
                wallet++
            }
             if (orderSuccess[i].discount) {
            
                discount = discount + parseInt(orderSuccess[i].discount)
                discount++
            }
        }

        productCount=await db.get().collection(collection.ORDER_COLLECTION).aggregate([
            {
                $match:{
                   $and:[{status:{$nin:["cancelled"]}
                },
            { date: { $gte: start, $lte: end }}]

                },
                
            },
            {
                $project:{
                    _id:0,
                    quantity:'$products.quantity'
                    
                }
            },
            {
                $unwind:'$quantity'
            },
            {
                $group: {
                    _id: null,
                    total: { $sum:'$quantity' }
                }
            }
          ]).toArray()

        var data = {
            start: moment(start).format('YYYY/MM/DD'),
            end: moment(end).format('YYYY/MM/DD'),
            totalOrders: orderTotalLength,
            successOrders: orderSuccessLength,
            failOrders: orderFailLength,
            totalSales: total,
            cod: cod,
            paypal: paypal,
            razorpay: razorpay,
            wallet:wallet,
            discount:discount,
            productCount:productCount[0].total,

            averageRevenue:total/productCount[0].total,

            currentOrders: orderSuccess
        }
    
        resolve(data)
    }catch {
        resolve(0)
    }
       })
     }

}