import 'dart:typed_data';
import 'package:flutter/material.dart';

class PassportPhotoValidationResult {
  final bool isValid;
  final String? errorMessage;
  final int? width;
  final int? height;
  final double? aspectRatio;

  const PassportPhotoValidationResult({
    required this.isValid,
    this.errorMessage,
    this.width,
    this.height,
    this.aspectRatio,
  });

  String get dimensionsText {
    if (width != null && height != null) {
      return '$width x $height px';
    }
    return '';
  }
}

class PassportPhotoValidator {
  /// Validates that an image meets Indian official college ID passport photo standards:
  /// 1. File size between 10 KB and 5 MB.
  /// 2. Image must be decodable.
  /// 3. Minimum resolution: 200 x 200 px.
  /// 4. Portrait format / aspect ratio: standard 3.5cm x 4.5cm (~0.78 aspect ratio).
  ///    Blocks landscape / horizontal pictures (ratio > 1.15) and excessively narrow crops (ratio < 0.55).
  static Future<PassportPhotoValidationResult> validate(
    Uint8List bytes, {
    String? fileName,
  }) async {
    // 1. File size validation
    const maxSizeBytes = 5 * 1024 * 1024; // 5 MB
    const minSizeBytes = 10 * 1024; // 10 KB

    if (bytes.length > maxSizeBytes) {
      final mb = (bytes.length / (1024 * 1024)).toStringAsFixed(1);
      return PassportPhotoValidationResult(
        isValid: false,
        errorMessage: 'Photo size ($mb MB) exceeds the 5 MB limit. Please select a smaller photo.',
      );
    }

    if (bytes.length < minSizeBytes) {
      return const PassportPhotoValidationResult(
        isValid: false,
        errorMessage: 'Photo file size is too small (<10 KB). Please provide a clearer, higher-quality photo.',
      );
    }

    // 2. Decode image and check dimensions
    try {
      final decodedImage = await decodeImageFromList(bytes);
      final width = decodedImage.width;
      final height = decodedImage.height;

      // Minimum resolution
      if (width < 200 || height < 200) {
        return PassportPhotoValidationResult(
          isValid: false,
          width: width,
          height: height,
          errorMessage: 'Photo resolution ($width x $height px) is too low. Minimum required is 200 x 200 px.',
        );
      }

      // Aspect ratio check for portrait orientation
      final ratio = width / height;

      if (ratio > 1.15) {
        return PassportPhotoValidationResult(
          isValid: false,
          width: width,
          height: height,
          aspectRatio: ratio,
          errorMessage: 'Invalid orientation ($width x $height px). Passport photos must be in portrait (vertical format), not landscape.',
        );
      }

      if (ratio < 0.55) {
        return PassportPhotoValidationResult(
          isValid: false,
          width: width,
          height: height,
          aspectRatio: ratio,
          errorMessage: 'Photo is excessively narrow. Please crop to standard 3.5 x 4.5 cm passport proportions.',
        );
      }

      return PassportPhotoValidationResult(
        isValid: true,
        width: width,
        height: height,
        aspectRatio: ratio,
      );
    } catch (e) {
      return PassportPhotoValidationResult(
        isValid: false,
        errorMessage: 'Failed to decode image. Please ensure the file is a valid JPG or PNG photograph.',
      );
    }
  }
}
