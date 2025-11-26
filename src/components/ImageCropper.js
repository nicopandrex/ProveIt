import React, {useEffect, useRef, useState} from 'react';
import {Modal, View, Text, TouchableOpacity, StyleSheet, Dimensions, Image, PanResponder, ActivityIndicator, Alert} from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';

const { width: screenWidth } = Dimensions.get('window');

export default function ImageCropper({
  visible,
  imageUri,
  onCancel,
  onCrop,
  cropSize = Math.round(screenWidth * 0.86),
  outputSize = 1024,
}) {
  const [imgW, setImgW] = useState(0);
  const [imgH, setImgH] = useState(0);
  const translate = useRef({ x: 0, y: 0 });
  const lastTranslate = useRef({ x: 0, y: 0 });
  const scale = useRef(1);
  const lastScale = useRef(1);
  const initialPinchDistance = useRef(null);
  const [, setTick] = useState(0); // force render

  useEffect(() => {
    if (imageUri) {
      Image.getSize(imageUri, (w, h) => {
        setImgW(w);
        setImgH(h);
        // reset transforms
        translate.current = { x: 0, y: 0 };
        lastTranslate.current = { x: 0, y: 0 };
        scale.current = 1;
        lastScale.current = 1;
        initialPinchDistance.current = null;
        setTick(t => t + 1);
      }, () => {
        Alert.alert('Error', 'Could not load image to crop.');
      });
    }
  }, [imageUri]);

  const containerSize = cropSize;

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt, gestureState) => {
      initialPinchDistance.current = null;
    },
    onPanResponderMove: (evt, gestureState) => {
      const touches = evt.nativeEvent.touches;
      if (touches && touches.length >= 2) {
        const t0 = touches[0];
        const t1 = touches[1];
        const dx = t1.pageX - t0.pageX;
        const dy = t1.pageY - t0.pageY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (initialPinchDistance.current == null) {
          initialPinchDistance.current = dist;
          lastScale.current = scale.current;
        } else {
          const factor = dist / initialPinchDistance.current;
          scale.current = Math.max(0.3, Math.min(8, lastScale.current * factor));
          setTick(t => t + 1);
        }
      } else {
        // single touch pan
        const dx = gestureState.dx;
        const dy = gestureState.dy;
        translate.current = {
          x: lastTranslate.current.x + dx,
          y: lastTranslate.current.y + dy,
        };
        setTick(t => t + 1);
      }
    },
    onPanResponderRelease: (evt, gestureState) => {
      lastTranslate.current = { ...translate.current };
      lastScale.current = scale.current;
      initialPinchDistance.current = null;
    },
    onPanResponderTerminationRequest: () => false,
  })).current;

  const computeCropParams = async () => {
    if (!imgW || !imgH) throw new Error('Image dimensions unknown');

    // scale to cover the container (so user can pan to choose crop)
    const scaleToCover = Math.max(containerSize / imgW, containerSize / imgH);
    const currentScale = scaleToCover * (scale.current || 1);

    const displayedW = imgW * currentScale;
    const displayedH = imgH * currentScale;

    // translate values are relative to container center; positive moves image right/down
    const tx = translate.current.x || 0;
    const ty = translate.current.y || 0;

    // image top-left relative to container
    const imageLeft = (containerSize / 2 + tx) - (displayedW / 2);
    const imageTop = (containerSize / 2 + ty) - (displayedH / 2);

    // origin in original image coords for crop (crop is the full container square)
    const originX = ((0 - imageLeft) * (imgW / displayedW));
    const originY = ((0 - imageTop) * (imgH / displayedH));

    const cropW = containerSize * (imgW / displayedW);
    const cropH = containerSize * (imgH / displayedH);

    // clamp
    const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
    const originXClamped = clamp(Math.round(originX), 0, Math.max(0, Math.round(imgW - cropW)));
    const originYClamped = clamp(Math.round(originY), 0, Math.max(0, Math.round(imgH - cropH)));
    const cropWClamped = Math.round(Math.min(cropW, imgW - originXClamped));
    const cropHClamped = Math.round(Math.min(cropH, imgH - originYClamped));

    return { originX: originXClamped, originY: originYClamped, width: cropWClamped, height: cropHClamped };
  };

  const handleUse = async () => {
    try {
      const crop = await computeCropParams();
      const actions = [{ crop }];
      // resize to outputSize for consistent uploads
      actions.push({ resize: { width: outputSize, height: outputSize } });
      const res = await ImageManipulator.manipulateAsync(imageUri, actions, { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG });
      onCrop && onCrop(res.uri);
    } catch (err) {
      console.error('Crop error', err);
      Alert.alert('Crop failed', 'Could not crop the image.');
    }
  };

  if (!visible) return null;

  // compute display style of image
  let displayStyle = {};
  if (imgW && imgH) {
    const scaleToCover = Math.max(containerSize / imgW, containerSize / imgH);
    const currentScale = scaleToCover * (scale.current || 1);
    const displayedW = imgW * currentScale;
    const displayedH = imgH * currentScale;
    const left = (containerSize / 2 + (translate.current.x || 0)) - (displayedW / 2);
    const top = (containerSize / 2 + (translate.current.y || 0)) - (displayedH / 2);
    displayStyle = {
      width: displayedW,
      height: displayedH,
      left,
      top,
    };
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.container}>
          <View style={[styles.cropArea, { width: containerSize, height: containerSize }]} {...panResponder.panHandlers}>
            {!imgW && <ActivityIndicator size="large" color="#fff" style={styles.loader} />}
            {imgW ? (
              <Image source={{ uri: imageUri }} style={[styles.image, displayStyle]} />
            ) : null}

            {/* Circular border to show crop */}
            <View pointerEvents="none" style={[styles.circle, { width: containerSize, height: containerSize, borderRadius: containerSize / 2 }]} />
          </View>

          <View style={styles.buttonsRow}>
            <TouchableOpacity style={styles.button} onPress={onCancel}>
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.primary]} onPress={handleUse}>
              <Text style={[styles.buttonText, styles.primaryText]}>Use Photo</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
  container: { width: '100%', alignItems: 'center' },
  cropArea: { backgroundColor: '#000', overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  image: { position: 'absolute' },
  circle: { position: 'absolute', borderWidth: 2, borderColor: 'rgba(255,255,255,0.95)' },
  buttonsRow: { marginTop: 18, flexDirection: 'row' },
  button: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.06)', marginHorizontal: 8 },
  primary: { backgroundColor: '#fff' },
  buttonText: { color: '#fff' },
  primaryText: { color: '#000' },
  loader: { position: 'absolute' },
});
