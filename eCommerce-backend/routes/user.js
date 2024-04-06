const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authMiddleware, roleCheckMiddleware } = require('../middlewares/AuthMiddleware');


// KULLANICI İŞLEMLERİ
router.post('/login', userController.login);
router.post('/register', userController.register);
// router.get('/listUsers', authMiddleware, roleCheckMiddleware('user'), userController.listUsers);
//PROFİLİM SAYFASI İŞLEMLERİ
router.get('/my-account', authMiddleware, userController.getUserDetails);
router.put('/update-account', authMiddleware, userController.updateUserDetail);

//SEPET - ÜRÜN İŞLEMLERİ
router.get('/my-basket', authMiddleware, userController.getCartItems);
router.post('/add-item', authMiddleware, userController.addItem);
router.post('/increase-item', authMiddleware, userController.increaseItem);
router.post('/delete-item', authMiddleware, userController.deleteItem);
router.get('/products', authMiddleware, userController.getProducts)

//LİSTE İŞLEMLERİ

router.get('/lists', authMiddleware, userController.getLists);
router.post('/create-list', authMiddleware, userController.createList);
router.post('/delete-list/:listId', authMiddleware, userController.deleteList);
router.post('/update-list/:listId', authMiddleware, userController.updateList);

//herkese açık liste için özel link erişimi
router.get('/publicList/:slug', userController.getPublicListItemsBySlug);

//LİSTE - İTEM İŞLEMLERİ

router.get('/lists/:listId/items', authMiddleware, userController.getItemsByListId);
router.post('/add-Item-to-List', authMiddleware, userController.addItemToList);
router.post('/remove-Item-to-List', authMiddleware, userController.removeItemFromList);

//ADRES İŞLEMLERİ

router.get('/addresses', authMiddleware, userController.getAddresses);
router.post('/create-address', authMiddleware, userController.createAddress);
router.put('/addresses/:addressId', authMiddleware, userController.updateAddress);
router.delete('/addresses/:addressId', authMiddleware, userController.deleteAddress);

//SİPARİŞ İŞLEMLERİ

router.get('/orders', authMiddleware, userController.getorders);
router.get('/orderItems', authMiddleware, userController.getOrderItems);
router.post('/create-order', authMiddleware, userController.createOrder);

//FAVORİ İŞLEMLERİ

router.get('/favorites', authMiddleware, userController.getFavorites);
router.post('/addFavoriteItem', authMiddleware, userController.addFavoriteItem);
router.post('/deleteFavoriteItem', authMiddleware, userController.deleteFavoriteItem);

// ÜRÜN DEĞERLENDİRME  İŞLEMLERİ

router.get('/product-comments/:productId', authMiddleware, userController.getProductComments);
router.get('/my-product-comments', authMiddleware, userController.getProductCommentsByUser);
router.post('/create-product-comment', authMiddleware, userController.createProductComments);
router.post('/update-product-comment', authMiddleware, userController.updateProductComments);
router.post('/delete-product-comment', authMiddleware, userController.deleteProductComments);

// SATICI DEĞERLENDİRME İŞLEMLERİ

router.get('/seller-comments/:sellerId', authMiddleware, userController.getSellerComments);
router.get('/my-seller-comments', authMiddleware, userController.getSellerCommentsByUser);
router.post('/create-seller-comment', authMiddleware, userController.createSellerComment);
router.post('/update-seller-comment', authMiddleware, userController.updateSellerComments);
router.post('/delete-seller-comment', authMiddleware, userController.deleteSellerComments);





module.exports = router;