import React, { useState, useEffect } from 'react';
import Card from '@mui/material/Card';
import { useNavigate } from 'react-router-dom';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import CardActions from '@mui/material/CardActions';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Rating from '@mui/material/Rating';
import CustomBadge from '@mui/material/Badge';
import { styled } from '@mui/material/styles';
import api from '../api/api';
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import ImageSlider from '../components/ImageSlider';
import MenuBar from '../components/MenuBar';
import { images } from '../App';
import ImageCarousel from '../components/ImageCarousel';
import { useDispatch } from 'react-redux'; // useDispatch hook'unu import ediyoruz
import { updateItem } from '../redux/cartSlice'; // addItem action'ını import ediyoruz

const CustomCard = styled(Card)(({ theme }) => ({
  flex: '1 0 calc(25% - 16px)', // Hesaplama her kart için %25 genişlik ve aralarında 8px boşluk sağlar
  maxWidth: 250, // Maksimum genişlik
  minHeight: 380,
  margin: '20px 8px', // Dikey marjin ve yatay padding
  transition: '0.3s',
  boxShadow: '0 8px 40px -12px rgba(0,0,0,0.1)',
  '&:hover': {
    boxShadow: '0 16px 70px -12.125px rgba(0,0,0,0.1)',
    '& $CardMedia': {
      transform: 'scale(1.05)',
    },
    cursor: 'pointer',
  },
}));

const CustomCardContent = styled(CardContent)({
  textAlign: 'left',
  padding: '16px',
});

const CustomTypography = styled(Typography)({
  color: '#2c3e50',
  fontWeight: 'bold',
});

const CustomButton = styled(Button)(({ theme }) => ({
  margin: 'auto',
  display: 'block',
  backgroundColor: '#e67e22',
  color: 'white',
  transition: 'background-color 0.2s',
  '&:hover': {
    backgroundColor: '#d35400',
  },
}));

const ProductNameTypography = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.secondary, // Bu kısım metnin rengini ayarlar
  marginLeft: theme.spacing(1), // Marka ve model arasındaki boşluk için
}));

const ProductCards = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const dispatch = useDispatch();
  const navigate = useNavigate(); // useNavigate hook'unu kullanmak için

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const response = await api.get('user/products');
        setProducts(response.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  

  const handleAddToCart = async (product) => {
    dispatch(updateItem({
      sellerProductId: product.seller_product_id,
      quantity: 1
    }));
  };

  if (loading) return <div>Yükleniyor...</div>;
  if (error) return <div>Hata: {error}</div>;

  return (
    <>
      <ImageSlider images={images} />
      <MenuBar />
      <Box display="flex" flexWrap="wrap" justifyContent="center" padding="0 8px" gap={2}>
        {products.map((product) => (
          <CustomCard key={product.product_id}>
            {product.fastDelivery && <CustomBadge color="error" badgeContent="Fast Delivery" />}
            <ImageCarousel images={product.product.productImages.map(img => img === null ? 'empty.jpg' : img.image_path)} />
            <CustomCardContent>
              <Box display="flex" justifyContent="start" alignItems="center">
                <CustomTypography variant="subtitle1" noWrap>
                  {product.product.Brand.brand_name || 'Unknown Brand'}
                </CustomTypography>
                <ProductNameTypography variant="subtitle1" noWrap>
                  {product.product.name}
                </ProductNameTypography>
              </Box>
              {product.commentCount > 0 && (
                <Box display="flex" justifyContent="space-between" alignItems="center" mt={1}>
                  <Rating name="half-rating-read" value={parseFloat(product.commentAvg) || 0} precision={0.5} readOnly />
                  <CustomTypography variant="m" marginRight={'100%'}>
                    {`(${product.commentCount})`}
                  </CustomTypography>
                </Box>
              )}
              <CustomTypography variant="h6" mt={1}>
                {product.price ? `${product.price.toFixed(2)} ₺` : 'Price Unknown'}
              </CustomTypography>
            </CustomCardContent>
            <CardActions>
              <CustomButton size="medium" fullWidth onClick={() => handleAddToCart(product)}>
                Sepete Ekle
              </CustomButton>
            </CardActions>
          </CustomCard>
        ))}
      </Box>
    </>
  );
};

export default ProductCards;
