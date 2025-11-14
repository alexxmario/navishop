import React, { useState, useEffect } from 'react';
import { useInput, useRecordContext } from 'react-admin';
import ImageManager from './ImageManager';

const ImageField = ({ source = 'images', maxImages = 20, ...props }) => {
  const {
    field: { value, onChange },
    fieldState: { error }
  } = useInput({ source, ...props });
  
  const record = useRecordContext();
  const [images, setImages] = useState([]);

  // Initialize images from record or field value
  useEffect(() => {
    const initialImages = value || record?.images || [];
    if (Array.isArray(initialImages)) {
      console.log('ImageField: Setting initial images:', initialImages);
      setImages(initialImages);
    }
  }, [value, record]);

  const handleImagesChange = (newImages) => {
    console.log('ImageField: Images changed:', newImages);
    setImages(newImages);
    onChange(newImages);
  };

  return (
    <ImageManager 
      images={images}
      onChange={handleImagesChange}
      maxImages={maxImages}
    />
  );
};

export default ImageField;