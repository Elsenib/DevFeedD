# DevFeed promo assets

Generated files:

- `images/devfeed-feature-graphic.png` - Google Play feature graphic style image
- `images/01-cover.png` ... `images/06-safety.png` - portrait store/presentation images
- `video/frames/frame-01.png` ... `frame-06.png` - video slideshow frames

Regenerate images:

```powershell
node scripts\generate-promo-assets.js
```

Recreate the silent MP4 from frames when `ffmpeg` is available:

```powershell
ffmpeg -y -framerate 1/3 -i marketing\video\frames\frame-%02d.png -vf "fps=30,format=yuv420p" marketing\video\devfeed-promo.mp4
```

Video voiceover:

1. DevFeed - Azərbaycanlı developer komunitası üçün sosial platforma.
2. Kod, deploy, media və iş paylaşımlarını canlı feed-də paylaş.
3. DM və public chat ilə komandalar və komunitə ilə əlaqədə qal.
4. İş elanlarına CV PDF ilə müraciət et, elanlarını önə çıxar.
5. Profilini qur, izləyicilərini artır və dəstək qəbul et.
6. Filter və bildiriş sistemi paylaşımı daha təhlükəsiz saxlayır.
