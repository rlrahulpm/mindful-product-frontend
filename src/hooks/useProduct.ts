import { useState, useEffect, useRef } from 'react';
import { Product } from '../types/product';

// Cache to store products and avoid duplicate requests
const productCache = new Map<string, Product>();
const ongoingRequests = new Map<string, Promise<Product>>();

export const useProduct = (productSlug: string | undefined) => {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!productSlug) {
      setProduct(null);
      setError(null);
      setLoading(false);
      return;
    }

    // Check cache first
    if (productCache.has(productSlug)) {
      const cachedProduct = productCache.get(productSlug)!;
      if (isMountedRef.current) {
        setProduct(cachedProduct);
        setError(null);
        setLoading(false);
      }
      return;
    }

    // Check if request is already ongoing
    if (ongoingRequests.has(productSlug)) {
      const existingRequest = ongoingRequests.get(productSlug)!;
      existingRequest
        .then((data) => {
          if (isMountedRef.current) {
            setProduct(data);
            setError(null);
            setLoading(false);
          }
        })
        .catch((err) => {
          if (isMountedRef.current) {
            setError(err.message || 'Failed to load product');
            setLoading(false);
          }
        });
      return;
    }

    const fetchProduct = async (): Promise<Product> => {
      const response = await fetch(
        `http://localhost:8080/api/products/by-slug/${productSlug}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Product not found');
        }
        throw new Error('Failed to fetch product');
      }

      const data = await response.json();
      return data;
    };

    // Start the request and store it
    if (isMountedRef.current) {
      setLoading(true);
      setError(null);
    }

    const requestPromise = fetchProduct();
    ongoingRequests.set(productSlug, requestPromise);

    requestPromise
      .then((data) => {
        // Cache the result
        productCache.set(productSlug, data);
        // Remove from ongoing requests
        ongoingRequests.delete(productSlug);
        
        if (isMountedRef.current) {
          setProduct(data);
          setError(null);
          setLoading(false);
        }
      })
      .catch((err) => {
        // Remove from ongoing requests
        ongoingRequests.delete(productSlug);
        
        if (isMountedRef.current) {
          setError(err.message || 'Failed to load product');
          setLoading(false);
        }
      });

  }, [productSlug]);

  return { product, loading, error };
};