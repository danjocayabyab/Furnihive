import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';

import { ProductDetailsScreen } from '@/src/screens/Product/ProductDetailsScreen';

export default function ProductDetailsRoute() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const id = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : '';

  return <ProductDetailsScreen id={id} onBack={() => router.back()} />;
}
