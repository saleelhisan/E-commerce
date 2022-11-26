const collection = require('../config/collection')
var db = require('../config/connection')
var objectId = require('mongodb').ObjectId

module.exports = {

    //total users count  
    getUsersCount: () => {
        return new Promise(async (resolve, reject) => {
            let count = 0
            let users = await db.get().collection(collection.USER_COLLECTION).find().toArray()
            if (users) {
                count = users.length
                resolve(count)
            } else {
                resolve(count)
            }

        })
    },



    totalOrders: () => {
        return new Promise(async (resolve, reject) => {
            let totalOrders = await db.get().collection(collection.ORDER_COLLECTION).count()
            resolve(totalOrders)
        })
    },



    totalProducts: () => {
        return new Promise(async (resolve, reject) => {
            let totalProducts = await db.get().collection(collection.PRODUCT_COLLECTION).count()
            resolve(totalProducts)
        })
    },



    cancelTotal: () => {
        return new Promise(async (resolve, reject) => {
            let orderCancelled = await db.get().collection(collection.ORDER_COLLECTION).find({ isCancelled: true }).count()
            resolve(orderCancelled)
        })
    },



    dailyRevenue: () => {
        return new Promise(async (resolve, reject) => {
            try {
                let dailyRevenue = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                    {
                        $match: {
                            date: {
                                $gte: new Date(new Date() - 1000 * 60 * 60 * 24)
                            }
                        }
                    },
                    {
                        $match: {
                            status: "delivered"
                        }

                    },
                    {
                        $group: {
                            _id: null,
                            totalAmount: { $sum: '$totalAmount' }
                        }
                    }

                ]).toArray()
                console.log(dailyRevenue);
                resolve(dailyRevenue[0].totalAmount)
            } catch {
                resolve(0)
            }
        })
    },



    weeklyRevenue: () => {
        return new Promise(async (resolve, reject) => {
            // console.log(new Date(new Date()-1000*60*60*24*2));
            try {
                let weeklyRevenue = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                    {
                        $match: {
                            date: {
                                $gte: new Date(new Date() - 1000 * 60 * 60 * 24 * 7)
                            }
                        }
                    },
                    {
                        $match: {
                            status: "delivered"
                        }

                    },
                    {
                        $group: {
                            _id: null,
                            totalAmount: { $sum: '$totalAmount' }
                        }
                    }
                ]).toArray()
                // console.log("weekly"+weeklyRevenue[0].totalAmount);
                resolve(weeklyRevenue[0].totalAmount)
            } catch {
                resolve(0)
            }

        })
    },



    yearlyRevenue: () => {
        return new Promise(async (resolve, reject) => {
            try {
                let yearlyRevenue = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                    {

                        $match: {
                            date: {
                                $gte: new Date(new Date() - 1000 * 60 * 60 * 24 * 7 * 4 * 12)
                            }
                        }
                    },
                    {
                        $match: {
                            status: "delivered"
                        }

                    },
                    {
                        $group: {
                            _id: null,
                            totalAmount: { $sum: '$totalAmount' }
                        }
                    }

                ]).toArray()

                resolve(yearlyRevenue[0].totalAmount)
            } catch {
                resolve(0)
            }
        })
    },



    totalRevenue: () => {
        return new Promise(async (resolve, reject) => {
            let totalRevenue = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: {
                        status: "delivered"
                    }

                },
                {
                    $project: {
                        totalAmount: "$totalAmount"
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalAmount: { $sum: '$totalAmount' }
                    }
                }
            ]).toArray()
            // console.log(totalRevenue[0].totalAmount);
            resolve(totalRevenue[0].totalAmount)
        })
    },


    
    getchartData: (req, res) => {

        return new Promise((resolve, reject) => {


            db.get().collection(collection.ORDER_COLLECTION).aggregate([
                { $match: { "status": "delivered" } },
                {
                    $project: {
                        date: { $convert: { input: "$_id", to: "date" } }, total: "$totalAmount"
                    }
                },
                {
                    $match: {
                        date: {
                            $lt: new Date(), $gt: new Date(new Date().getTime() - (24 * 60 * 60 * 1000 * 365))
                        }
                    }
                },
                {
                    $group: {
                        _id: { $month: "$date" },
                        total: { $sum: "$total" }
                    }
                },
                {
                    $project: {
                        month: "$_id",
                        total: "$total",
                        _id: 0
                    }
                }
            ]).toArray().then(result => {
                db.get().collection(collection.ORDER_COLLECTION).aggregate([
                    { $match: { "status": "delivered" } },
                    {
                        $project: {
                            date: { $convert: { input: "$_id", to: "date" } }, total: "$totalAmount"
                        }
                    },
                    {
                        $match: {
                            date: {
                                $lt: new Date(), $gt: new Date(new Date().getTime() - (24 * 60 * 60 * 1000 * 7))
                            }
                        }
                    },
                    {
                        $group: {
                            _id: { $dayOfWeek: "$date" },
                            total: { $sum: "$total" }
                        }
                    },
                    {
                        $project: {
                            date: "$_id",
                            total: "$total",
                            _id: 0
                        }
                    },
                    {
                        $sort: { date: 1 }
                    }
                ]).toArray().then(weeklyReport => {
                    console.log("weekly", weeklyReport)
                    console.log("result", result);
                    let obj = {
                        result, weeklyReport
                    }
                    // resolve(result,weeklyReport)
                    resolve(obj)
                    // res.json({ data: result, weeklyReport })
                    // console.log(result)
                })
            })

        })
    }

}



