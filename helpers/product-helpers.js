const { response } = require('express')
var db = require('../config/connection')
var collection = require('../config/collection')

var objectID = require('mongodb').ObjectId
module.exports = {



    addProduct: (product) => {
        product.date = new Date()
        product.price = parseInt(product.price)
        return new Promise(async (resolve, reject) => {
            let products = await db.get().collection('product').findOne({ name: product.name })
            if (products) {
                reject()
            } else {
                db.get().collection('product').insertOne(product).then((response) => {
                    resolve(response)
                })
            }
        })
    },


    
    getAllProduct: () => {
        return new Promise(async (resolve, reject) => {
            let products = await db.get().collection('product').find().sort({ date: -1 }).toArray()
            resolve(products)
        })
    },



    deleteProduct: (productId) => {
        return new Promise((resolve, reject) => {
            db.get().collection('product').deleteOne({ _id: objectID(productId) }).then((response) => {
                console.log("product deleted")
                resolve(response)

            })
        })

    },



    getProductDetails: (productId) => {
        return new Promise((resolve, reject) => {
            db.get().collection('product').findOne({ _id: objectID(productId) }).then((product) => {
                resolve(product)
            })
        })
    },



    updateProduct: (productId, productDetails) => {
        return new Promise((resolve, reject) => {
            db.get().collection('product').updateOne({ _id: objectID(productId) }, {
                $set: {
                    name: productDetails.name,
                    description: productDetails.description,
                    price: productDetails.price,
                    category: productDetails.category
                }
            }).then((response) => {
                resolve()
            })
        })
    },



    getAllProductUser: () => {
        return new Promise(async (resolve, reject) => {
            let products = await db.get().collection('product').find().toArray()
            resolve(products)
        })
    },



    viewProduct: (productId) => {
        return new Promise((resolve, reject) => {
            db.get().collection('product').findOne({ _id: objectID(productId) }).then((product) => {
                resolve(product)
            })
        })
    },



    getStocks: () => {
        return new Promise(async (resolve, reject) => {
            let stocks = await db.get().collection(collection.PRODUCT_COLLECTION).aggregate([{ $project: { name: "$name", stock: "$stock" } }]).toArray()
            resolve(stocks)
        })
    },


    
    updateStock: (proId, count) => {
        return new Promise((resolve, reject) => {
            // let currentock = await db.get().collection(collection.PRODUCT_COLLECTION).findOne({_id:objectID(proId)})
            // console.log(currentock);
            db.get().collection(collection.PRODUCT_COLLECTION).updateOne({ _id: objectID(proId) }, {
                $set: {
                    stock: parseInt(count)
                }
            }).then(() => {
                resolve()
            })
        })
    },
    // getStocksCount:(proId)=>{
    //     return new Promise(async(resolve, reject) => {

    //         let stocks = await db.get().collection(collection.PRODUCT_COLLECTION).findOne({_id:objectID(proId)})
    //         resolve(stocks.stock);



    //     })
    // }


}