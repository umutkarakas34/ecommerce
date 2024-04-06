const bcrypt = require("bcrypt"); // Şifreleri güvenli bir şekilde saklamak için bcrypt kütüphanesini kullanıyoruz
const User = require("../models/user");
const jwt = require("jsonwebtoken");
const { errors } = require("ethers");
const Cart = require("../models/cart");
const CartItem = require("../models/cartItem");
const sellerProduct = require("../models/sellerProduct");
const Seller = require("../models/seller");
const Product = require("../models/product");
const Brand = require("../models/Brand");
const Category = require("../models/category");
const ProductList = require("../models/productList");
const ProductListItems = require("../models/productListItems");
const Address = require("../models/address");
const Order = require("../models/order");
const orderStatus = require("../models/orderStatus");
const OrderItem = require("../models/orderItem");
const UserFavoriteProduct = require("../models/userFavoriteProduct");
const ProductComment = require("../models/productComment");
const ApprovalStatus = require("../models/approval_status");
const SellerComment = require("../models/sellerComment");

//KULLANICI İŞLEMLERİ 

const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // kullanıcı adı ile ara
    const user = await User.findOne({ where: { email } });

    // Kullanıcı bulunamazsa hata mesajı dön
    if (!user) {
      return res
        .status(401)
        .json({ message: "Kullanıcı bulunamadı veya şifre hatalı." });
    }

    // Kullanıcının şifresini doğrula
    const passwordMatch = await bcrypt.compare(password, user.password);

    // Şifre eşleşmiyorsa hata mesajı dön
    if (!passwordMatch) {
      return res
        .status(401)
        .json({ message: "Kullanıcı bulunamadı veya şifre hatalı." });
    }

    // Token oluştur (token içinde yalnızca gerekli ve güvenli bilgileri sakla)
    const tokenPayload = { id: user.user_id, email: user.email, role: "user" };
    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
      expiresIn: "100y", // Token süresi (örneğin 1 saat)
    });

    // Başarılı giriş yanıtı ve token dön
    return res
      .status(200)
      .json({ message: "Giriş başarılı.", token, role: "user" });
  } catch (error) {
    // Hata yakalama ve loglama
    console.error("Giriş sırasında bir hata oluştu:", error);
    return res.status(500).json({ message: "Sunucu hatası." });
  }
};
const register = async (req, res) => {
  const { email, password } = req.body;

  try {
    const existingUser = await User.findOne({ where: { email } });

    if (existingUser) {
      return res
        .status(400)
        .json({ message: "Bu e-posta zaten kullanılıyor." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      email: email,
      password: hashedPassword,
    });

    // Token oluştur
    const tokenPayload = {
      id: newUser.id,
      username: newUser.username,
      role: "user",
    };
    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
      expiresIn: "1h", // Token süresi (örneğin 1 saat)
    });

    return res.status(201).json({
      message: "Kullanıcı başarıyla oluşturuldu.",
      user: newUser,
      token,
    });
  } catch (error) {
    console.error("Kullanıcı kaydı sırasında bir hata oluştu:", error);
    return res.status(500).json({ message: "Sunucu hatası." });
  }
};
const listUsers = async (req, res) => {
  try {
    // Tüm admin kullanıcılarını veritabanından çek
    const users = await User.findAll();

    // Başarılı yanıtı dön
    return res.status(200).json(users);
  } catch (error) {
    // Hata durumunda hata mesajını döndür
    return res.status(500).json({ success: false, message: error.message });
  }
};
const getUserDetails = async (req, res) => {
  try {
    const user = await User.findOne({ where: { email: req.user.email } });

    return res.status(200).json(user);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
const updateUserDetail = async (req, res) => {
  try {
    const user = await User.findOne({ where: { email: req.user.email } });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Kullanıcı Bulunamadı' });
    }

    await user.update();

    return res.status(200).json({ success: true, message: 'Bilgileriniz güncellendi' });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
//SEPET İŞLEMLERİ
const addItem = async (req, res) => {
  try {
    const { sellerProductId, quantity } = req.body;

    // Kullanıcıyı doğrulayın
    const user = await User.findOne({ where: { email: req.user.email } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Satıcı ürününü ve ilişkili ürün bilgilerini kontrol edin
    const sp = await sellerProduct.findByPk(sellerProductId, {
      include: [Product]
    });
    if (!sp) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // İlk olarak stok adedini kontrol edin
    let maxQuantityAllowed = sp.stock;

    console.log(sp.stock, sp.product.max_buy)
    // Eğer stok miktarı max_buy'dan azsa, kullanıcının ekleyebileceği maksimum miktarı buna göre ayarlayın
    if (sp.stock < sp.product.max_buy) {
      maxQuantityAllowed = sp.stock;
    } else {
      // Eğer stok miktarı max_buy'dan fazla veya eşitse, max_buy değerini kullanın
      maxQuantityAllowed = sp.product.max_buy;
    }

    // Kullanıcının sepetindeki mevcut miktarı dikkate alarak son miktarı hesaplayın
    let finalQuantity = quantity;

    // Kullanıcının sepetini bul veya oluştur
    let cart = await Cart.findOne({ where: { user_id: user.user_id } });
    if (!cart) {
      cart = await Cart.create({ user_id: user.user_id });
    }

    // Sepet öğesini bul veya oluştur
    let cartItem = await CartItem.findOne({
      where: {
        cart_id: cart.cart_id,
        seller_product_id: sellerProductId,
      },
    });

    if (cartItem) {
      // Sepette zaten varsa, yeni miktarı hesapla
      let potentialNewQuantity = cartItem.quantity + quantity;
      if (potentialNewQuantity < maxQuantityAllowed) {
        cartItem.quantity = finalQuantity;
        await cartItem.save();
      } else {
        return res.status(404).json({ success: false, message: 'Sepete eklenecek maksimum ürün sayısına ulaştınız.' });
      }
    } else {
      // Sepet öğesi yoksa, yeni bir tane oluştur
      finalQuantity = cartItem.quantity;
      if (potentialNewQuantity < maxQuantityAllowed) {
        await CartItem.create({
          cart_id: cart.cart_id,
          seller_product_id: sellerProductId,
          quantity: finalQuantity,
        });
      } else {
        await CartItem.create({
          cart_id: cart.cart_id,
          seller_product_id: sellerProductId,
          quantity: maxQuantityAllowed,
        });
        return res.status(200).json({ success: true, message: 'Maximum ürün adedi kadar sepete eklendi.' });
      }

    }

    return res.status(200).json({ success: true, message: "Item added to cart", cartItem });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
const deleteItem = async (req, res) => {
  try {
    const { productId } = req.body;

    const user = await User.findOne({ where: { email: req.user.email } });
    const cart = await Cart.findOne({ where: { user_id: user.user_id } });

    if (!cart) {
      return res.status(404).json({ success: false, message: 'Sepet bulunamadı.' });
    }

    const item = await CartItem.findOne({ where: { cart_id: cart.cart_id, seller_product_id: productId } });
    if (!item) {
      return res.status(404).json({ success: false, message: 'Ürün sepetinizde bulunamadı.' });
    }

    await item.destroy();

    return res.status(200).json({ success: true, message: 'Ürün sepetten silindi.' });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
const increaseItem = async (req, res) => {
  try {
    const { productId } = req.body;

    const user = await User.findOne({ where: { email: req.user.email } });
    const cart = await Cart.findOne({ where: { user_id: user.user_id } });

    if (!cart) {
      return res.status(404).json({ success: false, message: 'Sepet bulunamadı.' });
    }

    const item = await CartItem.findOne({ where: { cart_id: cart.cart_id, seller_product_id: productId } });
    if (!item) {
      return res.status(404).json({ success: false, message: 'Ürün sepetinizde bulunamadı.' });
    }

    // Eğer miktar 1'den büyükse, miktarı bir azalt
    if (item.quantity > 1) {
      item.quantity -= 1;
      await item.save();
      return res.status(200).json({ success: true, message: 'Ürün miktarı azaltıldı.' });
    } else {
      // Miktar 1 ise, ürünü sepetten tamamen çıkar
      await item.destroy();
      return res.status(200).json({ success: true, message: 'Ürün sepetten silindi.' });
    }

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
const getCartItems = async (req, res) => {
  try {
    // Öncelikle kullanıcının email adresini kullanarak kullanıcıyı bulun
    const user = await User.findOne({ where: { email: req.user.email } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı.' });
    }

    // Kullanıcıya ait sepeti bulun
    const cart = await Cart.findOne({ where: { user_id: user.user_id } });
    if (!cart) {
      return res.status(404).json({ success: false, message: 'Sepet bulunamadı.' });
    }

    // Sepete ait ürünleri çeken bir sorgu yapın
    const items = await CartItem.findAll({
      where: { cart_id: cart.cart_id },
      include: [{
        model: sellerProduct, // Bu, ürün bilgilerini de çekmek istiyorsanız kullanılabilir 
        include: [{
          model: Seller,
        },
        {
          model: Product,
          include: [{
            model: Brand
          }]
        }]
      }]
    });

    // Sepetteki ürünleri döndür
    return res.status(200).json(items);

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
const getProducts = async (req, res) => {
  try {
    const user = await User.findOne({ where: { email: req.user.email } });

    const favoriteProductsIds = await UserFavoriteProduct.findAll({
      where: { user_id: user.user_id },
      attributes: ['product_id']
    }).then(favs => favs.map(fav => fav.product_id));

    let products = await sellerProduct.findAll({
      where: { is_active: 1, },
      include: [{
        model: Seller
      },
      {
        model: Product,
        include: [{
          model: Brand
        },
        {
          model: Category
        }]
      }],
      order: [['price', 'ASC']], // Fiyata göre sırala
    });

    // Ürünleri benzersiz hale getir ve en düşük fiyatlı olanı seç
    const uniqueProductsMap = new Map();
    products.forEach(product => {
      const productId = product.product.product_id;
      if (!uniqueProductsMap.has(productId) || product.price < uniqueProductsMap.get(productId).price) {
        uniqueProductsMap.set(productId, product);
      }
    });
    const uniqueLowestPriceProducts = Array.from(uniqueProductsMap.values());

    const productsWithFavoritesAndPrice = uniqueLowestPriceProducts.map(product => {
      const isFavorite = favoriteProductsIds.includes(product.product.product_id);
      const stockStatus = product.stock_quantity === 0 ? 'Stokta yok' : 'Stokta var';
      return {
        ...product.toJSON(),
        isFavorite: isFavorite, // FAVORİ DURUMU
        stockStatus: stockStatus //STOK DURUMU
      };
    });

    return res.status(200).json(productsWithFavoritesAndPrice);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

//LİSTE İŞLEMLERİ
const getLists = async (req, res) => {
  try {
    const user = await User.findOne({ where: { email: req.user.email } });

    const lists = await ProductList.findAll({ where: { user_id: user.user_id } });

    return res.status(200).json(lists);

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
const createList = async (req, res) => {
  try {
    const { listName } = req.body;
    // isPublic değerini boolean olarak al, undefined ise varsayılan olarak 0 kullan
    const isPublic = req.body.isPublic !== undefined ? req.body.isPublic : 0;
    const user = await User.findOne({ where: { email: req.user.email } });

    // Slug oluştur. Eğer liste herkese açıksa, benzersiz bir slug oluşturur.
    let slug = null;
    if (isPublic) {
      // Slug oluşturma. Gerçek uygulamalarda daha karmaşık ve benzersiz bir slug oluşturmayı düşünebilirsiniz.
      slug = listName.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
    }

    // Aynı isimde bir liste olup olmadığını kontrol et
    const existingList = await ProductList.findOne({
      where: {
        user_id: user.user_id,
        list_name: listName,
        // is_public ve slug kontrolünü burada yapmayabilirsiniz çünkü isim benzersizliği yeterli olacaktır.
      },
    });

    if (existingList) {
      // Liste zaten varsa, hata mesajı gönder
      return res.status(409).json({ success: false, message: 'Bu isimde bir liste zaten var.' });
    }

    // Yeni listeyi oluştur
    const newList = await ProductList.create({
      user_id: user.user_id,
      list_name: listName,
      is_public: isPublic,
      slug: slug, // Slug'ı veritabanına kaydet
    });

    return res.status(200).json({ success: true, message: 'Liste başarıyla oluşturuldu.', list: newList });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
const deleteList = async (req, res) => {
  try {
    const { listId } = req.params;
    const user = await User.findOne({ where: { email: req.user.email } });

    // Listeyi bul
    const list = await ProductList.findOne({
      where: {
        user_id: user.user_id,
        list_id: listId,
      },
    });

    if (!list) {
      return res.status(404).json({ success: false, message: 'Liste bulunamadı.' });
    }

    // Listeyi silmeden önce, ilişkili tüm ürünleri sil
    await ProductListItems.destroy({ where: { list_id: listId } });

    // Liste silme işlemi
    await list.destroy();

    return res.status(200).json({ success: true, message: 'Liste başarıyla silindi.' });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
const updateList = async (req, res) => {
  try {
    const { listId } = req.params; // URL'den listId'yi al
    const { isPublic } = req.body; // istek gövdesinden isPublic değerini al

    // İlgili kullanıcıyı bul
    const user = await User.findOne({ where: { email: req.user.email } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı.' });
    }

    // Güncellenecek listeyi bul
    const list = await ProductList.findOne({
      where: {
        user_id: user.user_id,
        list_id: listId,
      },
    });

    if (!list) {
      // Liste bulunamazsa, hata mesajı gönder
      return res.status(404).json({ success: false, message: 'Güncellenecek liste bulunamadı.' });
    }

    // isPublic durumuna göre slug güncelleme
    let updateFields = {
      is_public: isPublic,
    };

    if (isPublic) {
      // Eğer liste herkese açık yapılıyorsa, yeni bir slug oluştur
      const slug = list.list_name.toLowerCase().replace(/ /g, '-') + '-' + Date.now();
      updateFields.slug = slug;
    } else {
      // Eğer liste herkese kapalı yapılıyorsa, slug'ı sil
      updateFields.slug = null;
    }

    // Listeyi güncelle
    await list.update(updateFields);

    return res.status(200).json({ success: true, message: 'Liste başarıyla güncellendi.' });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
const getPublicListItemsBySlug = async (req, res) => {
  const { slug } = req.params;

  const list = await ProductList.findOne({
    where: {
      slug: slug,
      is_public: true
    },
    include: [{
      model: ProductListItems,
      include: [Product]
    }]
  });

  if (!list) {
    return res.status(404).json({ success: false, message: 'Liste bulunamadı.' });
  }

  // Liste ve ürünlerini döndür
  return res.json({ success: true, items: list.ProductListItems });
};
//LİSTE İTEM İŞLEMLERİ
const addItemToList = async (req, res) => {
  try {
    const { listId, productId } = req.body;
    const user = await User.findOne({ where: { email: req.user.email } });

    let targetListId = listId;

    if (!listId) {
      // "Beğendiklerim" listesini bul veya oluştur
      const favoritesList = await ProductList.findOrCreate({
        where: {
          user_id: user.user_id,
          list_name: 'Beğendiklerim',
        },
        defaults: { // findOrCreate metodunun "create" kısmı için varsayılan değerler
          user_id: user.user_id,
          list_name: 'Beğendiklerim',
        }
      });

      targetListId = favoritesList[0].dataValues.list_id; // findOrCreate döndürdüğü array'in ilk elemanındaki list_id'yi kullan
    }

    // Aynı ürünün aynı listeye eklenip eklenmediğini kontrol et
    const existingItem = await ProductListItems.findOne({
      where: {
        list_id: targetListId,
        product_id: productId,
      },
    });

    if (!existingItem) {
      // Ürün zaten listede yoksa, ekleyebiliriz
      await ProductListItems.create({
        list_id: targetListId,
        product_id: productId,
      });
    }

    return res.status(200).json({ success: true, message: 'Ürün listeye başarıyla eklendi.' });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
const getItemsByListId = async (req, res) => {
  try {
    const { listId } = req.params;
    const items = await ProductListItems.findAll({
      where: { list_id: listId },
      include: [{
        model: Product
      }]
    });

    const itemsWithBestPrice = await Promise.all(items.map(async (item) => {
      // Her bir ürün için en uygun fiyatlı SellerProduct'ı bul
      const bestPriceSellerProduct = await sellerProduct.findOne({
        where: {
          product_id: item.product.product_id,
          is_active: 1
        },
        order: [['price', 'ASC']],
        limit: 1
      });

      // Ürün bilgisi ile en uygun fiyatlı satıcı ürününü birleştir
      return {
        ...item.toJSON(),
        BestPriceSellerProduct: bestPriceSellerProduct
      };
    }));

    return res.json({ success: true, items: itemsWithBestPrice });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
const removeItemFromList = async (req, res) => {
  try {
    const { listId, productId } = req.body; // listId ve productId, istekten alınır

    // Ürünün varlığını kontrol et
    const item = await ProductListItems.findOne({
      where: {
        list_id: listId,
        product_id: productId,
      },
    });

    if (item) {
      // Ürün bulunursa, listeden sil
      await item.destroy();
      return res.status(200).json({ success: true, message: 'Ürün listeden başarıyla silindi.' });
    } else {
      // Ürün listeye eklenmemişse, bir hata mesajı gönder
      return res.status(404).json({ success: false, message: 'Listede bu ürün bulunamadı.' });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
//ADRES İŞLEMLERİ
const getAddresses = async (req, res) => {
  try {

    // Veritabanında bu email adresine sahip kullanıcıyı buluyoruz
    const user = await User.findOne({ where: { email: req.user.email } });

    if (!user) {
      return res.status(404).json({ success: false, message: "Kullanıcı bulunamadı." });
    }

    // Kullanıcıya ait adresleri buluyoruz
    const addresses = await Address.findAll({
      where: { user_id: user.user_id } // user.id, bulunan kullanıcının ID'sidir
    });

    // Adresler varsa, dönüyoruz
    if (addresses.length > 0) {
      return res.status(200).json({ success: true, addresses });
    } else {
      return res.status(404).json({ success: false, message: "Adres bulunamadı." });
    }
  } catch (error) {
    // Bir hata oluşursa, hatayı döndürüyoruz
    return res.status(500).json({ success: false, message: error.message });
  }
}
const createAddress = async (req, res) => {
  try {
    const user = await User.findOne({ where: { email: req.user.email } });
    if (!user) {
      return res.status(404).json({ success: false, message: "Kullanıcı bulunamadı." });
    }
    // Yeni adresi oluştur
    const newAddress = await Address.create({
      ...req.body,
      user_id: user.user_id
    });

    return res.status(201).json({ success: true, message: "Adres başarıyla eklendi.", address: newAddress });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
const updateAddress = async (req, res) => {
  try {
    const { addressId } = req.params; // URL'den adres ID'si alınır
    const user = await User.findOne({ where: { email: req.user.email } });
    const updatedData = req.body; // Güncellenecek adres bilgileri

    // Adresi ve adresin kullanıcıya ait olup olmadığını kontrol et
    const address = await Address.findOne({
      where: { address_id: addressId, user_id: user.user_id }
    });

    if (!address) {
      return res.status(404).json({ success: false, message: "Adres bulunamadı veya erişim yetkiniz yok." });
    }

    // Adresi güncelle
    await address.update(updatedData);
    return res.status(200).json({ success: true, message: "Adres başarıyla güncellendi.", address: address });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
const deleteAddress = async (req, res) => {
  try {
    const { addressId } = req.params; // URL'den adres ID'si alınır
    const user = await User.findOne({ where: { email: req.user.email } });

    // Adresi ve adresin kullanıcıya ait olup olmadığını kontrol et
    const address = await Address.findOne({
      where: { address_id: addressId, user_id: user.user_id }
    });

    if (!address) {
      return res.status(404).json({ success: false, message: "Adres bulunamadı veya erişim yetkiniz yok." });
    }

    // Adresi sil
    await address.destroy();
    return res.status(200).json({ success: true, message: "Adres başarıyla silindi." });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
//SİPARİŞ İŞLEMLERİ
const getorders = async (req, res) => {
  try {
    const user = await User.findOne({ where: { email: req.user.email } });
    const orders = await Order.findAll(
      {
        where: { user_id: user.user_id },
        include: [{ model: orderStatus }]
      });

    return res.status(200).json(orders);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
const getOrderItems = async (req, res) => {
  try {
    const { orderId } = req.body;
    const orderItems = await OrderItem.findAll(
      {
        where: { order_id: orderId },
        include: [
          {
            model: sellerProduct,
            include: [
              {
                model: Seller
              },
              {
                model: Product
              }
            ]
          },
          {
            model: orderStatus
          }]
      });

    return res.status(200).json(orderItems);

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
const createOrder = async (req, res) => {
  try {
    // Kullanıcıyı doğrulayın
    const user = await User.findOne({ where: { email: req.user.email } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Kullanıcının sepetini sorgulayın
    const cart = await Cart.findOne({
      where: { user_id: user.user_id },
      include: [{ model: CartItem, include: [sellerProduct] }]
    });
    if (!cart || !cart.cartItems.length) {
      return res.status(400).json({ success: false, message: 'Cart is empty' });
    }

    // Siparişin toplam fiyatını hesaplayın
    const total_price = cart.cartItems.reduce((accumulator, item) => {
      const itemTotal = item.quantity * item.sellerProduct.price;
      return accumulator + itemTotal;
    }, 0);

    // Yeni siparişi oluşturun
    const order = await Order.create({
      user_id: user.user_id,
      order_date: new Date(),
      total_price: total_price,
      order_status_id: 1
    });

    // Sipariş öğelerini oluşturun ve stoktan düşürün
    const updateStockPromises = cart.cartItems.map(async item => {
      const orderItem = await OrderItem.create({
        order_id: order.order_id,
        seller_product_id: item.seller_product_id,
        quantity: item.quantity,
      });

      // Stoktan düşür
      const sp = await sellerProduct.findByPk(item.seller_product_id);
      if (sp && sp.stock >= item.quantity) {
        await sp.update({
          stock: sp.stock - item.quantity
        });
      } else {
        // Stokta yeterli ürün yoksa hata döndür
        throw new Error('Insufficient stock for product ID: ' + item.seller_product_id);
      }

      return orderItem;
    });

    await Promise.all(updateStockPromises);

    // Sepeti temizleyin (opsiyonel)
    await CartItem.destroy({ where: { cart_id: cart.cart_id } });

    return res.status(200).json({ success: true, order });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
//FAVORİ İŞLEMLERİ
const getFavorites = async (req, res) => {
  try {
    const user = await User.findOne({ where: { email: req.user.email } });
    const favorites = await Product.findAll({ where: { user_id: user.user_id } });
    return res.status(200).json(favorites);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
const addFavoriteItem = async (req, res) => {
  try {
    const { productId } = req.body;
    const user = await User.findOne({ where: { email: req.user.email } });

    await UserFavoriteProduct.create({
      user_id: user.user_id,
      product_id: productId
    })

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
const deleteFavoriteItem = async (req, res) => {
  try {
    const { productId } = req.body;
    const user = await User.findOne({ where: { email: req.user.email } });

    await UserFavoriteProduct.destroy({
      user_id: user.user_id,
      product_id: productId
    })

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
// ÜRÜN DEĞERLENDİRME İŞLEMLERİ 

// (kullanıcının yorumları)
const getProductCommentsByUser = async (req, res) => {
  try {
    // Kullanıcıyı doğrulayın
    const user = await User.findOne({ where: { email: req.user.email } });
    if (!user) {
      return res.status(404).json({ success: false, message: "Kullanıcı bulunamadı." });
    }

    const productComments = await ProductComment.findAll({
      where: {
        user_id: user.user_id,
        is_deleted: 0 // Silinmemiş yorumları filtrele
      },
      include: [
        {
          model: ApprovalStatus,
          attributes: ['status_name']
        },
        {
          model: User,
          attributes: ['name', 'surname']
        },
        // sellerProduct modelini doğrudan Product modeli ile değiştir
        {
          model: Product,
          include: [
            {
              model: Brand,
              attributes: ['brand_name']
            }
          ],
          attributes: ['product_name', 'description']
        }
      ],
      order: [['comment_date', 'DESC']] // Yorumları yorum tarihine göre sırala
    });

    // Kullanıcı adlarını formatlayarak güncelle
    const formattedComments = productComments.map(comment => {
      if (comment.is_public === 0) {
        comment.user.name = formatUserName(comment.user.name, comment.is_public);
        comment.user.surname = formatUserName(comment.user.surname, comment.is_public);
        // Soyadını da formatlamak için benzer bir işlem yapabilirsiniz.
      }
      return comment;
    });

    return res.status(200).json(formattedComments);

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
// (ürüne gelen yorumlar)
const getProductComments = async (req, res) => {
  try {
    const { productId } = req.params; // Ürün ID'si, genellikle bir route parametresi olarak alınır

    const productComments = await ProductComment.findAll({
      where: {
        product_id: productId, // "seller_product_id" yerine doğrudan "product_id" kullanılır
        is_deleted: 0 // Silinmemiş yorumları filtrele
      },
      include: [
        {
          model: ApprovalStatus, // Bu modelin ProductComment ile ilişkilendirilmiş olması gerekiyor
          attributes: ['status_name']
        },
        {
          model: User, // Kullanıcı modeli, ProductComment ile ilişkilendirilmiş olmalı
          attributes: ['name', 'surname']
        },
        // Aşağıdaki ilişkilendirme varsayımsaldır ve gerçek model yapınıza bağlıdır
        // Eğer Product modeli doğrudan ProductComment ile ilişkilendirilmişse:
        {
          model: Product,
          include: [
            {
              model: Brand, // Brand modeli, Product ile ilişkilendirilmiş olmalı
              attributes: ['brand_name']
            }
          ],
          attributes: ['product_name', 'description']
        }
      ],
      order: [['comment_date', 'DESC']] // createdAt yerine modelde tanımlı olan comment_date kullanılır
    });

    // Kullanıcı adlarını ve yorumları formatlayarak güncelle
    const formattedComments = productComments.map(comment => {
      // Eğer is_public false ise, kullanıcı adını ve soyadını formatla
      // Bu formatlama fonksiyonunun tanımı burada verilmemiştir
      if (comment.is_public === 0) {
        comment.user.name = "Anonymous";
        comment.user.surname = "";
      }
      return {
        commentId: comment.comment_id,
        comment: comment.comment,
        rating: comment.rating,
        isPublic: comment.is_public,
        approvalStatus: comment.ApprovalStatus?.status_name,
        userName: `${comment.user.name} ${comment.user.surname}`,
        productName: comment.Product?.product_name,
        brandName: comment.Product?.Brand?.brand_name,
      };
    });

    return res.status(200).json(formattedComments);

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
const createProductComments = async (req, res) => {
  try {
    const { sellerProductId, comment, rating } = req.body;
    const isPublic = req.body.isPublic !== undefined ? req.body.isPublic : 1;

    // Oturumdan kullanıcı ID'sini al
    const user = await User.findOne({ where: { email: req.user.email } });

    // İlgili sellerProduct'ı bul
    const sellerProductInstance = await sellerProduct.findOne({ where: { seller_product_id: sellerProductId } });
    if (!sellerProductInstance) {
      return res.status(404).json({ success: false, message: "Satıcı ürünü bulunamadı." });
    }

    // Bu product_id için kullanıcının daha önce yorum yapıp yapmadığını kontrol et
    const existingComment = await ProductComment.findOne({
      include: [{
        model: sellerProduct,
        where: { product_id: sellerProductInstance.product_id },
        attributes: []
      }],
      where: { user_id: user.user_id },
    });

    if (existingComment) {
      return res.status(409).json({ success: false, message: "Bu ürün için zaten bir yorumunuz var." });
    }

    // Yeni yorum oluştur
    const newComment = await ProductComment.create({
      user_id: user.user_id,
      seller_product_id: sellerProductId,
      comment: comment,
      rating: rating,
      is_public: isPublic,
      is_deleted: 0,
      comment_date: new Date()
    });

    return res.status(201).json(newComment);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
const updateProductComments = async (req, res) => {
  try {
    const { commentId, isPublic } = req.body; // isPublic
    const user = await User.findOne({ where: { email: req.user.email } });

    // Yalnızca yorumun sahibi is_public değerini güncelleyebilir
    const updated = await ProductComment.update(
      { is_public: isPublic },
      { where: { comment_id: commentId, user_id: user.user_id } }
    );

    if (updated[0] > 0) {
      return res.status(200).json({ success: true, message: "Yorum durumu güncellendi." });
    } else {
      return res.status(404).json({ success: false, message: "Yorum bulunamadı veya güncellenemedi." });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
const deleteProductComments = async (req, res) => {
  try {
    const { commentId } = req.body; // Silinmek istenen yorumun ID'si
    const user = await User.findOne({ where: { email: req.user.email } });

    // Yalnızca yorumun sahibi yorumu silmek için işaretleyebilir
    const updated = await ProductComment.update(
      { is_deleted: 1 }, // is_deleted alanını 1 olarak güncelle
      { where: { comment_id: commentId, user_id: user.user_id } }
    );

    if (updated[0] > 0) {
      return res.status(200).json({ success: true, message: "Yorum başarıyla silindi." });
    } else {
      return res.status(404).json({ success: false, message: "Yorum bulunamadı veya zaten silinmiş." });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

//SATICI DEĞERLENDİRME İŞLEMLERİ 

// (kullanıcının yorumları)
const getSellerCommentsByUser = async (req, res) => {
  try {
    // user ID
    const user = await User.findOne({ where: { email: req.user.email } });

    // Satıcıya yapılan yorumları sorgula
    const sellerComments = await SellerComment.findAll({
      where: {
        user_id: user.user_id,
        is_deleted: 0 // Silinmemiş yorumları filtrele
      },
      include: [
        {
          model: User, // Yorumu yapan kullanıcı
          attributes: ['id', 'name', 'surname'] // Yalnızca belirli kullanıcı bilgilerini dahil et
        },
        {
          model: ApprovalStatus, // Yorumun onay durumu
        }
      ],
      order: [['createdAt', 'DESC']] // Yorumları oluşturulma tarihine göre sırala
    });

    // İsteğe bağlı olarak kullanıcı adını formatlayabilirsiniz
    const formattedComments = sellerComments.map(comment => {
      if (comment.is_public === 0) {
        comment.User.name = formatUserName(comment.User.name, comment.is_public);
        comment.User.surname = formatUserName(comment.User.surname, comment.is_public);
        // İsteğe bağlı olarak, kullanıcı soyadını da formatlayabilirsiniz
      }
      return comment;
    });

    return res.status(200).json(formattedComments);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
// (satıcıya yapılan tüm yorumlar)
const getSellerComments = async (req, res) => {
  try {
    const { sellerId } = req.params;

    // Satıcıya yapılan yorumları getir
    const sellerComments = await SellerComment.findAll({
      where: { seller_id: sellerId, is_public: 1 },
      include: [{
        model: User,
        attributes: ['name', 'username', 'email'] // İsteğe bağlı: kullanıcı adı ve email dışındaki bilgileri gizle
      }]
    });

    if (!sellerComments) {
      return res.status(404).json({ success: false, message: "Yorumlar bulunamadı." });
    }

    return res.status(200).json({ success: true, comments: sellerComments });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
const createSellerComment = async (req, res) => {
  try {
    const { sellerId, comment, rating } = req.body;
    const isPublic = req.body.isPublic !== undefined ? req.body.isPublic : 1;

    // Kullanıcıyı doğrula
    const user = await User.findOne({ where: { email: req.user.email } });
    if (!user) {
      return res.status(404).json({ success: false, message: "Kullanıcı bulunamadı." });
    }

    // Satıcıyı kontrol et
    const seller = await Seller.findOne({ where: { seller_id: sellerId } });
    if (!seller) {
      return res.status(404).json({ success: false, message: "Satıcı bulunamadı." });
    }

    // Yeni satıcı yorumu oluştur
    const newSellerComment = await SellerComment.create({
      user_id: user.user_id,
      seller_id: sellerId,
      comment: comment,
      rating: rating,
      is_public: isPublic,
      comment_date: new Date()
    });

    return res.status(201).json({ success: true, sellerComment: newSellerComment });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
const updateSellerComments = async (req, res) => {
  try {
    const { commentId, isPublic } = req.body;
    const user = await User.findOne({ where: { email: req.user.email } });

    // Yalnızca yorumun sahibi is_public değerini güncelleyebilir
    const updated = await SellerComment.update(
      { is_public: isPublic },
      { where: { comment_id: commentId, user_id: user.user_id } }
    );

    if (updated[0] > 0) {
      return res.status(200).json({ success: true, message: "Satıcı yorumu durumu güncellendi." });
    } else {
      return res.status(404).json({ success: false, message: "Satıcı yorumu bulunamadı veya güncellenemedi." });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
const deleteSellerComments = async (req, res) => {
  try {
    const { commentId } = req.body;
    const user = await User.findOne({ where: { email: req.user.email } });

    // Yalnızca yorumun sahibi yorumu silmek için işaretleyebilir
    const updated = await SellerComment.update(
      { is_deleted: 1 },
      { where: { comment_id: commentId, user_id: user.user_id } }
    );

    if (updated[0] > 0) {
      return res.status(200).json({ success: true, message: "Satıcı yorumu başarıyla silindi." });
    } else {
      return res.status(404).json({ success: false, message: "Satıcı yorumu bulunamadı veya zaten silinmiş." });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}




// Kullanıcı adı ve soyadını formatlayan yardımcı fonksiyon
function formatUserName(name, isPublic) {
  if (isPublic === 1) {
    const formattedFirstName = name.charAt(0) + '*'.repeat(name.length - 1);
    return `${formattedFirstName}`;
  } else {
    return `${name}`;
  }
}


module.exports = {
  login, register, listUsers, getUserDetails, updateUserDetail,
  addItem, deleteItem, increaseItem, getCartItems, getProducts,
  getLists, createList, deleteList, updateList,
  addItemToList, getItemsByListId, removeItemFromList, getPublicListItemsBySlug,
  getAddresses, createAddress, updateAddress, deleteAddress,
  getorders, getOrderItems, createOrder,
  getFavorites, addFavoriteItem, deleteFavoriteItem,
  getProductCommentsByUser, getProductComments, createProductComments,
  updateProductComments, deleteProductComments,
  getSellerCommentsByUser, getSellerComments, createSellerComment,
  updateSellerComments, deleteSellerComments

};
