import React, { useState, useEffect, useCallback } from 'react';
import Card from '@mui/material/Card';
import { Link, useNavigate } from 'react-router-dom';
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
import { useDispatch, useSelector } from 'react-redux';
import { updateItem, fetchCart, addItem } from '../redux/cartSlice';
import Snackbar from '@mui/material/Snackbar';
import MuiAlert from '@mui/material/Alert';
import { useAuth } from '../context/AuthContext';

const CustomCard = styled(Card)(({ theme }) => ({
  flex: '1 0 calc(25% - 16px)',
  maxWidth: 250,
  margin: '20px 8px',
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
  padding: '15px',
  height: '110px',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
});

const CustomTypography = styled(Typography)({
  color: '#2c3e50',
  fontWeight: 'bold',
  fontSize: '14px',
  textOverflow: 'clip',
  marginRight: '4px'
});

const CommentTypography = styled(Typography)({
  color: '#2c3e50',
  fontWeight: 'bold',
  fontSize: '14px',
  textOverflow: 'clip',
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
  color: theme.palette.text.secondary,
  marginLeft: '6px',
  fontSize: '14px',
}));

const Alert = React.forwardRef(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

const ProductCards = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { token } = useAuth();

  const cartItems = useSelector(state => state.cart.items);

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

  useEffect(() => {
    dispatch(fetchCart());
  }, [dispatch]);

  const handleAddToCart = useCallback((product) => {
    if (!token) {
      setAlertMessage('Lütfen önce giriş yapınız.');
      setAlertOpen(true);
      setTimeout(() => {
        navigate('/giris-yap');
      }, 2000);
      return;
    }

    if (!cartItems) {
      console.warn('Cart items not yet loaded. Please wait a moment.');
      return;
    }

    const existingItem = cartItems.find(item => item.sellerProductId === product.seller_product_id);
    const newQuantity = existingItem ? existingItem.quantity + 1 : 1;

    if (newQuantity > product.product.max_buy) {
      setAlertMessage(`Sepete maksimum ${product.product.max_buy} adet ürün ekleyebilirsiniz.`);
      setAlertOpen(true);
      return;
    } else if (newQuantity > product.stock) {
      setAlertMessage(`Yeterli stok yok. Maksimum alım limiti: ${product.stock}`);
      setAlertOpen(true);
      return;
    }

    if (existingItem) {
      dispatch(updateItem({
        sellerProductId: product.seller_product_id,
        quantity: newQuantity,
        price: product.price
      }));
    } else {
      dispatch(addItem({
        sellerProductId: product.seller_product_id,
        quantity: 1,
        price: product.price
      }));
    }
  }, [cartItems, dispatch, token, navigate]);

  const handleCloseAlert = () => {
    setAlertOpen(false);
  };

  if (loading) return <div>Yükleniyor...</div>;
  if (error) return <div>Hata: {error}</div>;

  return (
    <>
      <ImageSlider images={images} />
      <MenuBar />
      <Snackbar open={alertOpen} autoHideDuration={6000} onClose={handleCloseAlert}>
        <Alert onClose={handleCloseAlert} severity="warning">
          {alertMessage}
        </Alert>
      </Snackbar>
      <Box display="flex" flexWrap="wrap" justifyContent="center" padding="0 8px" gap={2}>
        {products.map((product) => (
          <CustomCard key={product.product_id}>
            {product.fastDelivery && <CustomBadge color="error" badgeContent="Fast Delivery" />}
            <Link to={'/urun/' + product.product.slug} ><ImageCarousel images={product.product.productImages.map(img => img.image_path)} /></Link>
            <CustomCardContent>
              <Box display="flex" justifyContent="start" alignItems="center">
                <Link style={{ textDecoration: 'none', overflow: 'hidden' }} to={'/marka/' + product.product.Brand.slug}>
                  <CustomTypography variant="subtitle1" noWrap>
                    {product.product.Brand.brand_name || 'Unknown Brand'}
                  </CustomTypography>
                </Link>
                <Link style={{ textDecoration: 'none', overflow: 'hidden' }} to={'/urun/' + product.product.slug}>
                  <ProductNameTypography variant="subtitle1" noWrap>
                    {product.product.name}
                  </ProductNameTypography>
                </Link>
              </Box>
              {product.commentCount > 0 && (
                <Box display="flex" justifyContent="space-between" alignItems="center" mt={1}>
                  <Rating name="half-rating-read" value={parseFloat(product.commentAvg) || 0} precision={0.5} readOnly />
                  <CommentTypography variant="m" marginRight={'100%'} marginLeft={'1.3px'}>
                    {`(${product.commentCount})`}
                  </CommentTypography>
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
      </Box >
    </>
  );
};

export default ProductCards;
