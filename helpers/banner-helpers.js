const { response } = require('express')
var db = require('../config/connection')
var collection = require('../config/collection')

var objectID = require('mongodb').ObjectId


module.exports = {
    addBanner: (banner) => {    
        return new Promise(async (resolve, reject) => {
            let banners = await db.get().collection('banner').findOne({ name: banner.name })
            if (banners) {
                reject()
            } else {
               await db.get().collection('banner').insertOne(banner).then((response) => {
                    resolve(response)
                })
            }
        })
    },
    getAllBanners:()=>{
        return new Promise(async(resolve,reject)=>{
            let banners = await db.get().collection('banner').find().toArray()
            resolve(banners)
        })
    },
    deleteBanner:(bannerId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection('banner').deleteOne({_id:objectID(bannerId)}).then((response)=>{
                console.log('banner deleted');
                resolve(response)
            })
        })
    }
}