const mongoClient = require('mongodb').MongoClient
const state={
    db:null
}

module.exports.connect=function(done){
    const url='mongodb+srv://saleelhisan:saleelhisan@cluster0.cbl8vcb.mongodb.net/test'
    const dbname = 'e-commerce'

    mongoClient.connect(url,(err,data)=>{
        if(err) return done(err)
        state.db = data.db(dbname)
        done()    
    })
    
}

module.exports.get=function(){
    return state.db
}