const PATCH_FLAG = '__nostoryxSafeImageUploadPatched';

function isGeneratedAtlasSource(key, source) {
  return key === 'generated-atlas'
    && typeof HTMLImageElement !== 'undefined'
    && source instanceof HTMLImageElement;
}

if (globalThis.Phaser?.Textures?.TextureManager) {
  const prototype = globalThis.Phaser.Textures.TextureManager.prototype;

  if (!prototype[PATCH_FLAG]) {
    const addImage = prototype.addImage;

    prototype.addImage = function addSafeImage(key, source, dataSource) {
      if (!isGeneratedAtlasSource(key, source)) {
        return addImage.call(this, key, source, dataSource);
      }

      const width = source.naturalWidth || source.width;
      const height = source.naturalHeight || source.height;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext('2d', {
        alpha: true,
        colorSpace: 'srgb',
        willReadFrequently: false,
      });
      if (!context) throw new Error('Unable to create the generated-atlas normalization canvas.');

      context.clearRect(0, 0, width, height);
      context.drawImage(source, 0, 0, width, height);

      // Reading one pixel forces Chromium to finish decoding palette/transparency data
      // before Phaser uploads the canvas to WebGL. Without this normalization,
      // SwiftShader and some mobile GPUs reject the source with texImage2D INVALID_VALUE.
      context.getImageData(0, 0, 1, 1);

      return this.addCanvas(key, canvas);
    };

    Object.defineProperty(prototype, PATCH_FLAG, {
      value: true,
      configurable: false,
      enumerable: false,
      writable: false,
    });
  }
}
