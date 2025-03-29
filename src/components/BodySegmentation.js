import React, { useRef, useEffect, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as bodySegmentation from '@tensorflow-models/body-segmentation';

// Body part colors for segmentation visualization
const BODY_PART_COLORS = {
  leftFace: { color: [110, 64, 170], label: 'Left Face' },
  rightFace: { color: [106, 72, 183], label: 'Right Face' },
  torsoFront: { color: [64, 125, 225], label: 'Torso Front' },
  torsoBack: { color: [70, 137, 231], label: 'Torso Back' },
  leftUpperArmFront: { color: [55, 184, 169], label: 'Left Upper Arm Front' },
  leftUpperArmBack: { color: [57, 168, 158], label: 'Left Upper Arm Back' },
  rightUpperArmFront: { color: [55, 184, 122], label: 'Right Upper Arm Front' },
  rightUpperArmBack: { color: [55, 168, 117], label: 'Right Upper Arm Back' },
  leftLowerArmFront: { color: [115, 196, 73], label: 'Left Lower Arm Front' },
  leftLowerArmBack: { color: [109, 178, 73], label: 'Left Lower Arm Back' },
  rightLowerArmFront: { color: [159, 197, 62], label: 'Right Lower Arm Front' },
  rightLowerArmBack: { color: [146, 180, 63], label: 'Right Lower Arm Back' },
  leftHand: { color: [213, 194, 49], label: 'Left Hand' },
  rightHand: { color: [226, 170, 42], label: 'Right Hand' },
  leftUpperLegFront: { color: [226, 123, 42], label: 'Left Upper Leg Front' },
  leftUpperLegBack: { color: [213, 117, 44], label: 'Left Upper Leg Back' },
  rightUpperLegFront: { color: [226, 75, 39], label: 'Right Upper Leg Front' },
  rightUpperLegBack: { color: [213, 75, 42], label: 'Right Upper Leg Back' },
  leftLowerLegFront: { color: [224, 40, 40], label: 'Left Lower Leg Front' },
  leftLowerLegBack: { color: [213, 42, 42], label: 'Left Lower Leg Back' },
  rightLowerLegFront: { color: [224, 39, 105], label: 'Right Lower Leg Front' },
  rightLowerLegBack: { color: [213, 42, 98], label: 'Right Lower Leg Back' },
  leftFoot: { color: [224, 39, 164], label: 'Left Foot' },
  rightFoot: { color: [213, 42, 158], label: 'Right Foot' }
};

const BodySegmentation = ({ videoRef }) => {
  const canvasRef = useRef(null);
  const segmentationRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [segmentationModel, setSegmentationModel] = useState(null);
  const [segmentationParams, setSegmentationParams] = useState({
    enableBodyParts: true,
    backgroundBlur: 7,
    enableBackground: true,
    backgroundImage: null,
    opacity: 0.7,
    maskBlur: 0,
  });
  const [captureMode, setCaptureMode] = useState('mask'); // 'mask', 'blur', 'parts', 'composite'
  const [isRecording, setIsRecording] = useState(false);
  const [recordedFrames, setRecordedFrames] = useState(0);
  const recordedDataRef = useRef([]);
  const [fps, setFps] = useState(0);
  const fpsCounterRef = useRef({ count: 0, lastTime: 0 });
  const backgroundImageRef = useRef(null);

  // Load segmentation model
  useEffect(() => {
    const loadBodySegmentation = async () => {
      try {
        // Ensure TensorFlow backend is ready
        await tf.ready();
        const backend = tf.getBackend();
        console.log('Using TensorFlow backend:', backend);
        
        // Updated configuration for MediaPipe SelfieSegmentation model
        // Use GPU acceleration if WebGL is available
        const segmentationConfig = {
          runtime: backend === 'webgl' ? 'mediapipe-gpu' : 'tfjs',
          modelType: 'general',
          enableSmoothing: true
        };
        
        console.log('Creating body segmentation model with config:', segmentationConfig);
        
        const segmenter = await bodySegmentation.createSegmenter(
          bodySegmentation.SupportedModels.MediaPipeSelfieSegmentation,
          segmentationConfig
        );
        
        setSegmentationModel(segmenter);
        console.log('Body segmentation model loaded successfully');
        setIsLoading(false);
        
      } catch (err) {
        console.error('Error initializing body segmentation:', err);
        
        // Try with tfjs as fallback
        try {
          console.log('Trying with tfjs runtime as fallback');
          const fallbackConfig = {
            runtime: 'tfjs',
            modelType: 'general'
          };
          
          const segmenter = await bodySegmentation.createSegmenter(
            bodySegmentation.SupportedModels.MediaPipeSelfieSegmentation,
            fallbackConfig
          );
          
          setSegmentationModel(segmenter);
          console.log('Body segmentation model loaded with fallback');
          setIsLoading(false);
        } catch (fallbackErr) {
          console.error('Fallback also failed:', fallbackErr);
          setError(`Failed to initialize body segmentation: ${err.message}`);
          setIsLoading(false);
        }
      }
    };

    loadBodySegmentation();
  }, []);

  // Process video frames and perform segmentation
  useEffect(() => {
    if (isLoading || !segmentationModel) return;

    let animationFrameId;
    let lastProcessedTime = 0;
    const processInterval = 1000 / 25; // Limit to 25 fps for segmentation
    
    const processFrame = async (timestamp) => {
      // Calculate FPS
      if (timestamp - fpsCounterRef.current.lastTime >= 1000) {
        setFps(fpsCounterRef.current.count);
        fpsCounterRef.current.count = 0;
        fpsCounterRef.current.lastTime = timestamp;
      }
      fpsCounterRef.current.count++;
      
      // Skip frames to maintain target frame rate
      if (timestamp - lastProcessedTime < processInterval) {
        animationFrameId = requestAnimationFrame(processFrame);
        return;
      }
      
      lastProcessedTime = timestamp;
      
      try {
        if (
          videoRef?.current?.video &&
          videoRef.current.video.readyState === 4 &&
          canvasRef?.current
        ) {
          const video = videoRef.current.video;
          const canvas = canvasRef.current;
          
          // Check if canvas is valid before getting context
          if (!canvas || typeof canvas.getContext !== 'function') {
            console.error('Invalid canvas reference');
            animationFrameId = requestAnimationFrame(processFrame);
            return;
          }
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            console.error('Failed to get 2D context');
            animationFrameId = requestAnimationFrame(processFrame);
            return;
          }
          
          // Ensure canvas matches video dimensions
          if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
          }
          
          // Perform segmentation with updated API
          try {
            const segmentation = await segmentationModel.segmentPeople(video, {
              flipHorizontal: false,
              multiSegmentation: false,
              segmentBodyParts: segmentationParams.enableBodyParts
            });
            
            segmentationRef.current = segmentation;
            
            // Render based on mode
            if (segmentation && segmentation.length > 0) {
              switch (captureMode) {
                case 'mask':
                  drawBodyMask(ctx, segmentation, canvas.width, canvas.height);
                  break;
                case 'blur':
                  drawBackgroundBlur(ctx, segmentation, video, canvas.width, canvas.height);
                  break;
                case 'parts':
                  drawBodyParts(ctx, segmentation, canvas.width, canvas.height);
                  break;
                case 'composite':
                  drawCompositeEffect(ctx, segmentation, video, canvas.width, canvas.height);
                  break;
                default:
                  drawBodyMask(ctx, segmentation, canvas.width, canvas.height);
              }
              
              // Draw UI overlay with info
              drawUI(ctx, canvas.width, canvas.height);
              
              // Save frame if recording
              if (isRecording) {
                recordFrame(segmentation, timestamp);
              }
            } else {
              // No person detected
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              ctx.fillStyle = '#1a1a1a';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              
              // Show "No person detected" message
              ctx.fillStyle = 'white';
              ctx.font = 'bold 24px Arial';
              ctx.textAlign = 'center';
              ctx.fillText('No person detected', canvas.width / 2, canvas.height / 2);
              
              ctx.font = '16px Arial';
              ctx.fillText('Please position yourself in the camera view', canvas.width / 2, canvas.height / 2 + 30);
            }
          } catch (segmentError) {
            console.error('Segmentation error:', segmentError);
            
            // Draw error message on canvas
            if (ctx) {
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              ctx.fillStyle = '#1a1a1a';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              
              ctx.fillStyle = 'red';
              ctx.font = 'bold 16px Arial';
              ctx.textAlign = 'center';
              ctx.fillText('Segmentation error: ' + segmentError.message, canvas.width / 2, canvas.height / 2);
            }
          }
        } else {
          console.log('Video or canvas not ready', 
            Boolean(videoRef?.current), 
            Boolean(videoRef?.current?.video), 
            videoRef?.current?.video?.readyState,
            Boolean(canvasRef?.current)
          );
        }
      } catch (err) {
        console.error('Error in body segmentation processing:', err);
      }
      
      animationFrameId = requestAnimationFrame(processFrame);
    };
    
    animationFrameId = requestAnimationFrame(processFrame);
    
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isLoading, segmentationModel, captureMode, segmentationParams, isRecording, videoRef]);

  // Draw body mask (silhouette)
  const drawBodyMask = (ctx, segmentation, width, height) => {
    try {
      if (!ctx) {
        console.error('Invalid context in drawBodyMask');
        return;
      }
      
      // Clear canvas
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, width, height);
      
      if (!segmentation || segmentation.length === 0) return;
      
      // Draw person mask
      const foregroundColor = { r: 255, g: 255, b: 255, a: segmentationParams.opacity };
      const backgroundColor = { r: 0, g: 0, b: 0, a: 0 };
      const personMask = segmentation[0]?.mask || segmentation[0];
      
      if (personMask && personMask.data) {
        console.log('Rendering mask with dimensions:', personMask.width, personMask.height);
        
        // Draw mask using drawMask helper if available
        if (bodySegmentation.drawMask && typeof bodySegmentation.drawMask === 'function') {
          try {
            bodySegmentation.drawMask(
              ctx, 
              videoRef.current.video, 
              personMask, 
              foregroundColor, 
              backgroundColor,
              segmentationParams.maskBlur
            );
          } catch (drawMaskError) {
            console.error('Error using bodySegmentation.drawMask:', drawMaskError);
            // Fallback to manual drawing if drawMask throws an error
            drawMaskManually(ctx, videoRef.current.video, personMask, foregroundColor, backgroundColor);
          }
        } else {
          // Fallback to manual drawing if drawMask isn't available
          drawMaskManually(ctx, videoRef.current.video, personMask, foregroundColor, backgroundColor);
        }
      } else {
        console.error('Mask not found in segmentation result');
      }
    } catch (err) {
      console.error('Error drawing body mask:', err);
    }
  };
  
  // Manual mask drawing as fallback
  const drawMaskManually = (ctx, video, mask, foregroundColor, backgroundColor) => {
    try {
      if (!ctx || !video || !mask || !mask.data) {
        console.error('Invalid arguments to drawMaskManually', { 
          hasCtx: Boolean(ctx), 
          hasVideo: Boolean(video), 
          hasMask: Boolean(mask),
          hasMaskData: Boolean(mask?.data)
        });
        return;
      }
      
      // Create a temporary canvas for compositing
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = mask.width;
      tempCanvas.height = mask.height;
      
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) {
        console.error('Failed to get 2D context for temp canvas');
        return;
      }
      
      // Draw video first
      tempCtx.drawImage(video, 0, 0, mask.width, mask.height);
      
      // Create mask image data
      const imageData = tempCtx.getImageData(0, 0, mask.width, mask.height);
      const data = imageData.data;
      
      // Apply mask
      for (let i = 0; i < mask.data.length; i++) {
        const j = i * 4;
        if (j >= data.length) continue; // Skip if out of bounds
        
        const maskVal = mask.data[i] / 255;
        
        // Blend foreground and background based on mask
        data[j] = data[j] * maskVal + backgroundColor.r * (1 - maskVal);
        data[j+1] = data[j+1] * maskVal + backgroundColor.g * (1 - maskVal);
        data[j+2] = data[j+2] * maskVal + backgroundColor.b * (1 - maskVal);
        data[j+3] = maskVal * foregroundColor.a * 255 + backgroundColor.a * (1 - maskVal) * 255;
      }
      
      // Put the manipulated image data back
      tempCtx.putImageData(imageData, 0, 0);
      
      // Draw the result to the main canvas
      ctx.drawImage(tempCanvas, 0, 0, ctx.canvas.width, ctx.canvas.height);
    } catch (err) {
      console.error('Error in drawMaskManually:', err);
    }
  };
  
  // Draw background blur effect
  const drawBackgroundBlur = (ctx, segmentation, video, width, height) => {
    try {
      if (!ctx) {
        console.error('Invalid context in drawBackgroundBlur');
        return;
      }
      
      // Clear canvas
      ctx.clearRect(0, 0, width, height);
      
      if (!segmentation || segmentation.length === 0) return;
      
      const mask = segmentation[0]?.mask;
      
      // Check if we have a valid mask
      if (!mask || !mask.data) {
        console.error('Mask not found in segmentation result for blur effect');
        // Draw the video as fallback
        ctx.drawImage(video, 0, 0, width, height);
        return;
      }
      
      const opacity = segmentationParams.opacity;
      const blurAmount = segmentationParams.backgroundBlur;
      
      // Draw the video first
      ctx.drawImage(video, 0, 0, width, height);
      
      // Create a temporary canvas for the blur effect
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = width;
      tempCanvas.height = height;
      const tempCtx = tempCanvas.getContext('2d');
      
      if (!tempCtx) {
        console.error('Failed to get context for temporary canvas');
        return;
      }
      
      // Draw the video on the temp canvas and apply blur
      tempCtx.drawImage(video, 0, 0, width, height);
      tempCtx.filter = `blur(${blurAmount}px)`;
      tempCtx.drawImage(tempCanvas, 0, 0);
      tempCtx.filter = 'none';
      
      // Draw the blurred background to main canvas
      ctx.save();
      ctx.drawImage(tempCanvas, 0, 0);
      
      // Check if drawMask function exists
      if (bodySegmentation.drawMask && typeof bodySegmentation.drawMask === 'function') {
        try {
          // Then draw the foreground (person) using the mask
          ctx.globalCompositeOperation = 'destination-out';
          bodySegmentation.drawMask(
            ctx, 
            video, 
            mask, 
            { r: 255, g: 255, b: 255, a: 1 }, // Use white for the mask
            { r: 0, g: 0, b: 0, a: 0 },
            0
          );
          
          // Switch back to drawing the foreground
          ctx.globalCompositeOperation = 'source-over';
          bodySegmentation.drawMask(
            ctx, 
            video, 
            mask, 
            { r: 255, g: 255, b: 255, a: 1 }, // Original video
            { r: 0, g: 0, b: 0, a: 0 },
            0
          );
        } catch (drawMaskError) {
          console.error('Error using bodySegmentation.drawMask:', drawMaskError);
          // Fallback to manual method if drawMask throws an error
          ctx.globalCompositeOperation = 'destination-out';
          drawMaskManually(ctx, video, mask, 
            { r: 255, g: 255, b: 255, a: 1 }, 
            { r: 0, g: 0, b: 0, a: 0 }
          );
          
          ctx.globalCompositeOperation = 'source-over';
          drawMaskManually(ctx, video, mask, 
            { r: 255, g: 255, b: 255, a: 1 }, 
            { r: 0, g: 0, b: 0, a: 0 }
          );
        }
      } else {
        // Fallback method if drawMask isn't available
        ctx.globalCompositeOperation = 'destination-out';
        drawMaskManually(ctx, video, mask, 
          { r: 255, g: 255, b: 255, a: 1 }, 
          { r: 0, g: 0, b: 0, a: 0 }
        );
        
        ctx.globalCompositeOperation = 'source-over';
        drawMaskManually(ctx, video, mask, 
          { r: 255, g: 255, b: 255, a: 1 }, 
          { r: 0, g: 0, b: 0, a: 0 }
        );
      }
      
      ctx.restore();
    } catch (err) {
      console.error('Error in drawBackgroundBlur:', err);
      if (ctx && video) {
        // Draw original video as fallback
        ctx.drawImage(video, 0, 0, width, height);
      }
    }
  };
  
  // Draw body parts with different colors
  const drawBodyParts = (ctx, segmentation, width, height) => {
    try {
      if (!ctx) {
        console.error('Invalid context in drawBodyParts');
        return;
      }
      
      // Clear canvas
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, width, height);
      
      if (!segmentation || segmentation.length === 0) return;
      
      // Check if we have a valid mask
      const mask = segmentation[0]?.mask;
      if (!mask || !mask.data) {
        console.error('Mask not found in segmentation result for body parts effect');
        return;
      }
      
      // Draw base background
      if (segmentationParams.enableBackground) {
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, width, height);
      }
      
      // Create a gradient effect for the body
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, 'rgba(224, 39, 164, 0.8)');   // Head - purple
      gradient.addColorStop(0.3, 'rgba(64, 125, 225, 0.8)'); // Torso - blue
      gradient.addColorStop(0.6, 'rgba(55, 184, 169, 0.8)'); // Arms - teal
      gradient.addColorStop(1.0, 'rgba(226, 75, 39, 0.8)');  // Legs - orange
      
      // Draw the gradient through the mask
      ctx.save();
      
      // First draw the video with the person
      if (bodySegmentation.drawMask && typeof bodySegmentation.drawMask === 'function' && videoRef?.current?.video) {
        try {
          bodySegmentation.drawMask(
            ctx,
            videoRef.current.video,
            mask,
            { r: 255, g: 255, b: 255, a: segmentationParams.opacity },
            { r: 0, g: 0, b: 0, a: 0 },
            0
          );
          
          // Then overlay the gradient on the person
          if (segmentationParams.enableBodyParts) {
            ctx.globalCompositeOperation = 'overlay';
            ctx.fillStyle = gradient;
            
            // Draw the gradient only where the mask is
            bodySegmentation.drawMask(
              ctx,
              null, // No background image for this overlay
              mask,
              { r: 255, g: 255, b: 255, a: 0.7 }, // Use mask with semi-transparency
              { r: 0, g: 0, b: 0, a: 0 },
              0
            );
          }
        } catch (drawMaskError) {
          console.error('Error using bodySegmentation.drawMask in body parts:', drawMaskError);
          // Fallback to simplified method
          if (videoRef?.current?.video) {
            drawMaskManually(
              ctx,
              videoRef.current.video,
              mask,
              { r: 255, g: 255, b: 255, a: segmentationParams.opacity },
              { r: 0, g: 0, b: 0, a: 0 }
            );
            
            // Simplified gradient overlay for fallback
            if (segmentationParams.enableBodyParts) {
              ctx.globalCompositeOperation = 'overlay';
              ctx.fillStyle = gradient;
              ctx.fillRect(0, 0, width, height);
            }
          }
        }
      } else {
        // Fallback method if drawMask isn't available
        if (videoRef?.current?.video) {
          drawMaskManually(
            ctx,
            videoRef.current.video,
            mask,
            { r: 255, g: 255, b: 255, a: segmentationParams.opacity },
            { r: 0, g: 0, b: 0, a: 0 }
          );
          
          // Simplified gradient overlay for fallback
          if (segmentationParams.enableBodyParts) {
            ctx.globalCompositeOperation = 'overlay';
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, height);
          }
        }
      }
      
      ctx.restore();
    } catch (err) {
      console.error('Error in drawBodyParts:', err);
      // Draw a placeholder colored rect as fallback
      if (ctx) {
        ctx.fillStyle = 'rgba(64, 125, 225, 0.5)';
        ctx.fillRect(0, 0, width, height);
        
        // Add error message
        ctx.fillStyle = 'white';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Error rendering body parts: ' + err.message, width / 2, height / 2);
      }
    }
  };
  
  // Draw composite effect (custom visualization)
  const drawCompositeEffect = (ctx, segmentation, video, width, height) => {
    try {
      if (!ctx || !video) {
        console.error('Invalid context or video in drawCompositeEffect');
        return;
      }
      
      // Clear canvas
      ctx.clearRect(0, 0, width, height);
      
      if (!segmentation || segmentation.length === 0) return;
      
      // Check if we have a valid mask
      const mask = segmentation[0]?.mask;
      if (!mask || !mask.data) {
        console.error('Mask not found in segmentation result for composite effect');
        // Draw original video as fallback
        ctx.drawImage(video, 0, 0, width, height);
        return;
      }
      
      // Draw background image or color
      if (segmentationParams.backgroundImage && backgroundImageRef.current) {
        // Draw background image stretched to canvas size
        ctx.drawImage(backgroundImageRef.current, 0, 0, width, height);
      } else {
        // Use a gradient background as fallback
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, '#1a2a3a');
        gradient.addColorStop(1, '#0a0a1a');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
      }
      
      // Apply glow/edge effect around person
      ctx.save();
      
      // Check if drawMask function exists
      if (bodySegmentation.drawMask && typeof bodySegmentation.drawMask === 'function') {
        try {
          // Draw person with the mask
          bodySegmentation.drawMask(
            ctx,
            video,
            mask,
            { r: 255, g: 255, b: 255, a: 1 }, // Full opacity for person
            { r: 0, g: 0, b: 0, a: 0 },
            0
          );
          
          // Add glow effect
          ctx.globalCompositeOperation = 'screen';
          
          // Create an edge mask by dilating and then subtracting original mask
          const edgeMask = createEdgeMask(mask, width, height);
          
          if (edgeMask) {
            // Draw edge with glow
            ctx.shadowColor = 'rgba(0, 200, 255, 0.8)';
            ctx.shadowBlur = 15;
            
            bodySegmentation.drawMask(
              ctx,
              null,
              edgeMask,
              { r: 0, g: 200, b: 255, a: 0.8 }, // Bright blue for edges
              { r: 0, g: 0, b: 0, a: 0 },
              0
            );
            
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
          }
        } catch (drawMaskError) {
          console.error('Error using bodySegmentation.drawMask in composite effect:', drawMaskError);
          // Fallback to simplified method
          drawMaskManually(
            ctx,
            video,
            mask,
            { r: 255, g: 255, b: 255, a: 1 },
            { r: 0, g: 0, b: 0, a: 0 }
          );
        }
      } else {
        // Fallback if drawMask isn't available
        drawMaskManually(
          ctx,
          video,
          mask,
          { r: 255, g: 255, b: 255, a: 1 },
          { r: 0, g: 0, b: 0, a: 0 }
        );
      }
      
      ctx.restore();
      
      // Add a vignette effect
      try {
        const vignetteGradient = ctx.createRadialGradient(
          width / 2, height / 2, height * 0.1,
          width / 2, height / 2, height * 0.8
        );
        vignetteGradient.addColorStop(0, 'rgba(0,0,0,0)');
        vignetteGradient.addColorStop(1, 'rgba(0,0,0,0.7)');
        
        ctx.globalCompositeOperation = 'overlay';
        ctx.fillStyle = vignetteGradient;
        ctx.fillRect(0, 0, width, height);
      } catch (gradientError) {
        console.error('Error creating vignette gradient:', gradientError);
      }
    } catch (err) {
      console.error('Error in drawCompositeEffect:', err);
      // Draw original video as fallback
      if (ctx && video) {
        ctx.drawImage(video, 0, 0, width, height);
        
        // Add error message
        ctx.fillStyle = 'red';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Error rendering composite effect: ' + err.message, width / 2, 20);
      }
    }
  };
  
  // Create an edge mask from a body part mask
  const createEdgeMask = (mask, width, height) => {
    try {
      if (!mask || !mask.data || !mask.width || !mask.height) {
        console.error('Invalid mask provided to createEdgeMask');
        return null;
      }
      
      // Validate mask dimensions
      if (mask.data.length !== mask.width * mask.height) {
        console.error('Mask dimensions do not match data length in createEdgeMask');
        return null;
      }
      
      // Create a new edge mask with the same dimensions
      const edgeMask = {
        data: new Uint8Array(mask.data.length),
        width: mask.width,
        height: mask.height
      };
      
      // Simple edge detection - if a pixel is in the mask but at least one neighbor isn't
      for (let y = 1; y < mask.height - 1; y++) {
        for (let x = 1; x < mask.width - 1; x++) {
          const idx = y * mask.width + x;
          
          // Ensure we're not accessing outside the array bounds
          if (idx < 0 || idx >= mask.data.length) continue;
          
          const isPixelInMask = mask.data[idx] !== 0;
          
          // Check neighbors (simplified 4-direction check) with bounds checking
          let hasEmptyNeighbor = false;
          
          // Left neighbor
          if (x > 0 && mask.data[idx - 1] === 0) hasEmptyNeighbor = true;
          // Right neighbor
          else if (x < mask.width - 1 && mask.data[idx + 1] === 0) hasEmptyNeighbor = true;
          // Top neighbor
          else if (y > 0 && mask.data[idx - mask.width] === 0) hasEmptyNeighbor = true;
          // Bottom neighbor
          else if (y < mask.height - 1 && mask.data[idx + mask.width] === 0) hasEmptyNeighbor = true;
          
          // Set edge pixel if it's in the mask but has at least one empty neighbor
          edgeMask.data[idx] = (isPixelInMask && hasEmptyNeighbor) ? 255 : 0;
        }
      }
      
      return edgeMask;
    } catch (error) {
      console.error('Error in createEdgeMask:', error);
      return null;
    }
  };
  
  // Record segmentation frame
  const recordFrame = (segmentation, timestamp) => {
    if (!segmentation || segmentation.length === 0) return;
    
    // Store the segmentation data (for simplicity, just store a snapshot of key data)
    const frameData = {
      timestamp,
      hasPerson: true,
      bounds: segmentation[0].boundingBox, // Bounding box of the person
    };
    
    recordedDataRef.current.push(frameData);
    setRecordedFrames(recordedDataRef.current.length);
  };
  
  // Draw UI with info and controls
  const drawUI = (ctx, width, height) => {
    try {
      if (!ctx) {
        console.error('Invalid context in drawUI');
        return;
      }
      
      // Display mode and fps info
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(10, 10, 200, 70);
      
      ctx.fillStyle = 'white';
      ctx.font = 'bold 14px Arial';
      ctx.fillText('Body Segmentation', 20, 30);
      
      ctx.font = '12px Arial';
      ctx.fillText(`Mode: ${captureMode}`, 20, 50);
      ctx.fillText(`FPS: ${fps}`, 20, 70);
      
      // Draw recording indicator if recording
      if (isRecording) {
        const recordY = 10;
        const recordX = width - 150;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(recordX, recordY, 140, 30);
        
        // Draw blinking red circle
        const blink = Math.floor(Date.now() / 500) % 2 === 0;
        if (blink) {
          ctx.fillStyle = 'red';
          ctx.beginPath();
          ctx.arc(recordX + 15, recordY + 15, 8, 0, Math.PI * 2);
          ctx.fill();
        }
        
        ctx.fillStyle = 'white';
        ctx.fillText(`Recording: ${recordedFrames}`, recordX + 30, recordY + 20);
      }
    } catch (err) {
      console.error('Error drawing UI:', err);
    }
  };
  
  // Reset recorded data
  const resetRecording = () => {
    recordedDataRef.current = [];
    setRecordedFrames(0);
  };
  
  // Export recorded data
  const exportRecording = () => {
    if (recordedDataRef.current.length === 0) return;
    
    try {
      const exportData = JSON.stringify(recordedDataRef.current);
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `segmentation_${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting recording:', err);
    }
  };
  
  // Load background image
  const loadBackgroundImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        backgroundImageRef.current = img;
        setSegmentationParams(prev => ({
          ...prev,
          backgroundImage: URL.createObjectURL(file)
        }));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };
  
  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e.key.toLowerCase()) {
        case 'm':
          // Cycle through modes
          setCaptureMode(prev => {
            const modes = ['mask', 'blur', 'parts', 'composite'];
            const currentIndex = modes.indexOf(prev);
            const nextIndex = (currentIndex + 1) % modes.length;
            return modes[nextIndex];
          });
          break;
          
        case 'b':
          // Toggle body parts
          setSegmentationParams(prev => ({
            ...prev,
            enableBodyParts: !prev.enableBodyParts
          }));
          break;
          
        case 'r':
          // Toggle recording
          if (isRecording) {
            setIsRecording(false);
          } else {
            resetRecording();
            setIsRecording(true);
          }
          break;
          
        case '+':
        case '=':
          // Increase opacity
          setSegmentationParams(prev => ({
            ...prev,
            opacity: Math.min(prev.opacity + 0.1, 1.0)
          }));
          break;
          
        case '-':
          // Decrease opacity
          setSegmentationParams(prev => ({
            ...prev,
            opacity: Math.max(prev.opacity - 0.1, 0.1)
          }));
          break;
          
        case '[':
          // Decrease blur
          setSegmentationParams(prev => ({
            ...prev,
            backgroundBlur: Math.max(prev.backgroundBlur - 1, 0)
          }));
          break;
          
        case ']':
          // Increase blur
          setSegmentationParams(prev => ({
            ...prev,
            backgroundBlur: Math.min(prev.backgroundBlur + 1, 20)
          }));
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRecording, segmentationParams]);

  return (
    <div className="body-segmentation">
      {/* Main canvas for rendering */}
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#1a1a1a',
        }}
      />
      
      {/* Mode controls */}
      <div className="segmentation-controls">
        <button 
          className={`segmentation-button ${captureMode === 'mask' ? 'active' : ''}`}
          onClick={() => setCaptureMode('mask')}
        >
          Mask
        </button>
        <button 
          className={`segmentation-button ${captureMode === 'blur' ? 'active' : ''}`}
          onClick={() => setCaptureMode('blur')}
        >
          Background Blur
        </button>
        <button 
          className={`segmentation-button ${captureMode === 'parts' ? 'active' : ''}`}
          onClick={() => setCaptureMode('parts')}
        >
          Body Parts
        </button>
        <button 
          className={`segmentation-button ${captureMode === 'composite' ? 'active' : ''}`}
          onClick={() => setCaptureMode('composite')}
        >
          Composite
        </button>
        
        {/* Record & export buttons */}
        <button 
          className={`segmentation-button record-button ${isRecording ? 'recording' : ''}`}
          onClick={() => {
            if (isRecording) {
              setIsRecording(false);
            } else {
              resetRecording();
              setIsRecording(true);
            }
          }}
        >
          {isRecording ? 'Stop Recording' : 'Record'}
        </button>
        {recordedFrames > 0 && (
          <button 
            className="segmentation-button export-button"
            onClick={exportRecording}
          >
            Export
          </button>
        )}
        
        {/* Background image upload (for composite mode) */}
        <label className="segmentation-button">
          Background Image
          <input 
            type="file" 
            accept="image/*" 
            style={{ display: 'none' }}
            onChange={loadBackgroundImage}
          />
        </label>
      </div>
      
      {/* Parameter controls */}
      <div className="segmentation-params">
        <div className="param-slider">
          <label>Opacity: {segmentationParams.opacity.toFixed(1)}</label>
          <input 
            type="range" 
            min="0.1" 
            max="1.0" 
            step="0.1"
            value={segmentationParams.opacity}
            onChange={(e) => setSegmentationParams(prev => ({
              ...prev,
              opacity: parseFloat(e.target.value)
            }))}
          />
        </div>
        
        <div className="param-slider">
          <label>Blur: {segmentationParams.backgroundBlur}</label>
          <input 
            type="range" 
            min="0" 
            max="20" 
            value={segmentationParams.backgroundBlur}
            onChange={(e) => setSegmentationParams(prev => ({
              ...prev,
              backgroundBlur: parseInt(e.target.value)
            }))}
          />
        </div>
        
        <div className="param-checkbox">
          <label>
            <input 
              type="checkbox"
              checked={segmentationParams.enableBodyParts}
              onChange={(e) => setSegmentationParams(prev => ({
                ...prev,
                enableBodyParts: e.target.checked
              }))}
            />
            Show Body Parts
          </label>
        </div>
      </div>
      
      {/* Status overlays */}
      {isLoading && (
        <div className="segmentation-overlay loading">
          Initializing Body Segmentation...
        </div>
      )}
      {error && (
        <div className="segmentation-overlay error">
          Error: {error}
        </div>
      )}
      
      {/* Keyboard shortcuts help */}
      <div className="segmentation-shortcuts">
        <div className="shortcut-title">Keyboard shortcuts:</div>
        <div className="shortcut-item">M - Cycle through modes</div>
        <div className="shortcut-item">B - Toggle body parts</div>
        <div className="shortcut-item">R - Start/stop recording</div>
        <div className="shortcut-item">+/- - Adjust opacity</div>
        <div className="shortcut-item">[/] - Adjust blur</div>
      </div>
    </div>
  );
};

export default BodySegmentation; 