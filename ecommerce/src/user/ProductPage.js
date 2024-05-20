import React, { useState, useEffect } from 'react';
import { useParams,Link } from 'react-router-dom';
import { Box, Grid, Typography, Button, Rating, Paper, Card, CardContent } from '@mui/material';
import NavBar from '../components/UserNavbar';
import Footer from '../components/UserFooter';
import SimpleImageSlider from '../components/SimpleImageSlider';
import api from '../api/api';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import '../styles/ProductPage.css';
import ProductTabs from '../components/ProductTabs';

const theme = createTheme({
  palette: {
    primary: {
      main: '#003399',
    },
    secondary: {
      main: '#FF6600',
    },
  },
  typography: {
    fontFamily: 'Arial, sans-serif',
  },
});

const ProductPage = () => {
  const { productSlug } = useParams();
  const [product, setProduct] = useState(null);
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [caption, setCaption] = useState('');

  useEffect(() => {
    const fetchProductAndSellers = async () => {
      setLoading(true);
      try {
        const productResponse = await api.get(`user/product/${productSlug}`);
        setProduct(productResponse.data);
        setCaption(productResponse.data.product.caption);
      } catch (err) {
        setError('Ürün bilgileri yüklenirken bir hata oluştu: ' + err.message);
      }

      try {
        const sellersResponse = await api.get(`user/products/${productSlug}`);
        setSellers(sellersResponse.data.sellers);
      } catch (err) {
        setError('Satıcı bilgileri yüklenirken bir hata oluştu: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProductAndSellers();
  }, [productSlug]);

  return (
    <>
      <NavBar />
      <ThemeProvider theme={theme}>
        <Grid container spacing={2} sx={{ maxWidth: 1200, mx: 'auto', my: 5 }}>
          <Paper elevation={3} sx={{ width: '100%', display: 'flex', flexDirection: 'column', p: 3 }}>
            <Grid container spacing={2} justifyContent="center">
              {console.log(product)}
              <Grid item xs={12} md={6} className="image-carousel" sx={{ position: 'relative' }}>
                {product && (
                  <SimpleImageSlider images={product.product.productImages.map(img => img.image_path)} showNavs={true} />
                )}
              </Grid>
              <Grid item xs={12} md={6} sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Typography variant="subtitle1" sx={{ display: 'flex', gap: 1, mb: 1 }}>
                  <Typography color="text.secondary">{product?.product.Brand.brand_name} </Typography>
                  <Typography color="text.secondary">{product?.product?.name} </Typography>
                  <Typography color="text.secondary">{product?.product?.category.category_name}</Typography>
                </Typography>
                <Typography variant="h6" sx={{ color: 'secondary.main', fontWeight: 'bold', mb: 2 }}>
                  {`${product?.price.toFixed(2)} ₺`}
                </Typography>
                {
                  product?.commentCount > 0 && (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Rating value={parseFloat(product?.commentAvg) || 0} readOnly precision={0.1} />
                      <Typography variant="body2" sx={{ ml: 1, color: 'text.secondary' }}>
                        ({product.commentCount} reviews)
                      </Typography>
                    </Box>
                  )
                }
                <Button variant="contained" color="secondary" sx={{ width: '100%', mt: 3, py: 1, color: 'white' }}>Sepete Ekle</Button>
                {product?.seller && (
                  <Card sx={{ mt: 2, width: '100%', backgroundColor: '#f5f5f5' }}> {/* Gri arka plan rengi */}
                    <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                          Satıcı: <Link to={`/seller/${product.seller.username}`} style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#003399', textDecoration: 'none' }}>{product.seller.username}</Link>
                        </Typography>
                        <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          Puan: <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#4CAF50' }}>9.7</span>
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                )}
              </Grid >
            </Grid >
          </Paper >
          {product && <ProductTabs product={product.product} />}
        </Grid>
        <Footer />
      </ThemeProvider>
    </>
  );
}

export default ProductPage;
