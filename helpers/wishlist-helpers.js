const { response } = require('express')
var db = require('../config/connection')
var collection = require('../config/collection')

var ObjectId = require('mongodb').ObjectId



module.exports = {



    addToWishlist: (userId, proId) => {
        let proObj = {
            item: ObjectId(proId),
        }
        return new Promise(async (resolve, reject) => {
            console.log(userId, proId);
            let userWishlist = await db.get().collection('wishlist').findOne({ user: ObjectId(userId) })
            console.log(userWishlist);
            if (userWishlist) {
                let proExist = userWishlist.products.findIndex(product => product.item == proId)
                if (proExist != -1) {
                    db.get().collection('wishlist').updateOne({ user: ObjectId(userId), 'products.item': ObjectId(proId) }, {
                        $pull: { products: { item: ObjectId(proId) } }
                    }).then(() => {
                        console.log('wishlist item pulled ');
                        reject()
                    })
                } else {
                    db.get().collection('wishlist').updateOne({ user: ObjectId(userId) }, {
                        $push: { products: { item: ObjectId(proId) } }
                    }).then(() => {
                        console.log('wished item pushed');
                        resolve()
                    })
                }

            } else {
                wishobj = {
                    user: ObjectId(userId),
                    products: [proObj]
                }
                db.get().collection('wishlist').insertOne(wishobj).then(() => {
                    console.log('created and pushed');
                    resolve()
                })
            }
        })
    },



    getWishlists: (userId) => {
        return new Promise(async (resolve, reject) => {
            let wishlistItems = await db.get().collection('wishlist').aggregate([
                {
                    $match: { user: ObjectId(userId) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
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
                        item: 1, product: { $arrayElemAt: ['$product', 0] }
                    }
                }
            ]).toArray()
            console.log(wishlistItems);
            resolve(wishlistItems)
        })
    },


    
    removeWishlist: (proId, userId) => {
        return new Promise((resolve, reject) => {
            db.get().collection('wishlist').updateOne({ user: ObjectId(userId), 'products.item': ObjectId(proId) }, {
                $pull: { products: { item: ObjectId(proId) } }
            }).then((response) => {
                resolve()
            })
        })
    }
}