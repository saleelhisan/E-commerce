function addToCart(proId) {
    $.ajax({
        url: '/add-to-cart/' + proId,
        method: 'get',
        success: (response) => {
            if (response.status) {
                let count = $('#cart-counts').html()
                count = parseInt(count) + 1
                $("#cart-counts").html(count)
                swal.fire({
                    icon: "success",
                    title: "Item Added To Cart",
                    showConfirmButton: false,
                    timer: 1000
                })
            }else if(response.noStock){
                swal.fire({
                    icon:"warning",
                    title:"Oops",
                    text:"Product is out of stock"
                }).then(()=>{
                    location.reload()
                })
            }else if(response.limit){
                swal.fire({
                    icon:"warning",
                    title:"Limit exceeded",
                    text:"You have reached your limit"
                })
            }
            
            else{
                swal.fire({
                    icon:"warning",
                    title:"Login to continue"
                })
            }
        }
    })
}



function addToWishlist(proId){
    $.ajax({
        url:'/add-to-wishlist/'+proId,
        method:'get',
        success:(response)=>{
            if(response.status){
                let count = $('#wishlist-count').html()
                count = parseInt(count) + 1
                $("#wishlist-count").html(count)
                Swal.fire({
                icon: 'success',
                title: 'Item added to wishlist',
                showConfirmButton: false,
                timer: 1500
                })
                document.getElementById(proId).style.color="red";
            }else{
                let count = $('#wishlist-count').html()
                count = parseInt(count) - 1
                $("#wishlist-count").html(count)
                Swal.fire({
                icon: 'success',
                title: 'Item Removed in wishlist',
                showConfirmButton: false,
                timer: 1500
                })
                document.getElementById(proId).style.color="grey";
            }
        }
    
    })
    }


function selectAddress(name, address, town, district, state, pincode, phone) {
    document.getElementById('name').value = name
    document.getElementById('address').value = address
    document.getElementById('town').value = town
    document.getElementById('district').value = district
    document.getElementById('state').value = state
    document.getElementById('pincode').value = pincode
    document.getElementById('phone').value = phone
}













